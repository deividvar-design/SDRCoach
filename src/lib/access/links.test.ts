import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/funnel", () => ({ logFunnel: vi.fn(async () => true) }));

// A minimal stand-in for the service-role client: records what the claim writes.
const writes: { table: string; op: string; payload: unknown; filter?: unknown }[] = [];
const state: { link: Record<string, unknown> | null; createUser: { data: { user: { id: string } | null }; error: { message: string } | null }; rpc: { data: string | null; error: { message: string } | null } } = {
  link: null,
  createUser: { data: { user: { id: "user-1" } }, error: null },
  rpc: { data: "org-1", error: null },
};
function table(name: string) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  Object.assign(q, {
    select: chain, eq: (col: string, v: unknown) => { q.filter = { col, v }; return q; },
    maybeSingle: async () => ({ data: name === "access_links" ? state.link : null }),
    update: (payload: unknown) => { writes.push({ table: name, op: "update", payload }); return q; },
    insert: async (payload: unknown) => { writes.push({ table: name, op: "insert", payload }); return { error: null }; },
    then: (resolve: (v: unknown) => void) => resolve({ error: null }),
  });
  return q;
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: table,
    rpc: async (name: string, args: unknown) => { writes.push({ table: "rpc", op: name, payload: args }); return state.rpc; },
    auth: { admin: { createUser: async (args: unknown) => { writes.push({ table: "auth", op: "createUser", payload: args }); return state.createUser; } } },
  }),
}));

const { claimAccessLink, linkStatus } = await import("./links");
const TOKEN = "a".repeat(48);
const openLink = () => ({ id: "link-1", token: TOKEN, email: "Lead@Example.com", company: "Example Co", calls: 25, days: 21, claimed_at: null, revoked_at: null, expires_at: new Date(Date.now() + 86_400_000).toISOString() });

describe("linkStatus", () => {
  it("reads the row", () => {
    expect(linkStatus(openLink())).toBe("open");
    expect(linkStatus({ ...openLink(), claimed_at: "2026-11-01" })).toBe("claimed");
    expect(linkStatus({ ...openLink(), revoked_at: "2026-11-01" })).toBe("revoked");
    expect(linkStatus({ ...openLink(), expires_at: "2020-01-01" })).toBe("expired");
  });
});

describe("claimAccessLink", () => {
  beforeEach(() => { writes.length = 0; state.link = openLink(); state.createUser = { data: { user: { id: "user-1" } }, error: null }; state.rpc = { data: "org-1", error: null }; });

  it("creates the user, the workspace with the link's allowance, the prospects, and marks the link claimed", async () => {
    const r = await claimAccessLink(TOKEN, { password: "hunter22hunter", fullName: "Sam" });
    expect(r).toEqual({ ok: true, email: "lead@example.com", orgId: "org-1" });
    const user = writes.find((w) => w.op === "createUser")!.payload as Record<string, unknown>;
    expect(user).toMatchObject({ email: "lead@example.com", password: "hunter22hunter", email_confirm: true, user_metadata: { full_name: "Sam" } });
    const rpc = writes.find((w) => w.table === "rpc")!.payload as Record<string, unknown>;
    expect(rpc).toMatchObject({ p_name: "Example Co", p_user_id: "user-1", p_trial_domain: null });
    expect(String(rpc.p_slug)).toMatch(/^example-co-[a-z0-9]{4}$/);
    const org = writes.find((w) => w.table === "organizations")!.payload as Record<string, unknown>;
    expect(org.trial_call_limit).toBe(25);
    expect(new Date(String(org.trial_ends_at)).getTime()).toBeGreaterThan(Date.now() + 20 * 86_400_000);
    const targets = writes.find((w) => w.table === "targets")!.payload as unknown[];
    expect(targets.length).toBeGreaterThan(3);
    const claimed = writes.find((w) => w.table === "access_links")!.payload as Record<string, unknown>;
    expect(claimed).toMatchObject({ org_id: "org-1", user_id: "user-1" });
    expect(claimed.claimed_at).toBeTruthy();
  });

  it("refuses a used, revoked, expired or malformed link before touching auth", async () => {
    state.link = { ...openLink(), claimed_at: "2026-11-01" };
    expect(await claimAccessLink(TOKEN, { password: "hunter22hunter" })).toMatchObject({ code: "invalid" });
    state.link = openLink();
    expect(await claimAccessLink("not-a-token", { password: "hunter22hunter" })).toMatchObject({ code: "invalid" });
    expect(writes.find((w) => w.op === "createUser")).toBeUndefined();
  });

  it("sends an existing address to sign in and never changes its password", async () => {
    state.createUser = { data: { user: null }, error: { message: "A user with this email address has already been registered" } };
    const r = await claimAccessLink(TOKEN, { password: "hunter22hunter" });
    expect(r).toMatchObject({ code: "exists" });
    expect(writes.filter((w) => w.table === "rpc" || w.table === "organizations")).toHaveLength(0);
  });
});
