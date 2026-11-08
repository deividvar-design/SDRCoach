import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/funnel", () => ({ logFunnel: vi.fn(async () => true) }));

// A minimal stand-in for the service-role client: records what the claim writes.
const writes: { table: string; op: string; payload: unknown; filter?: unknown }[] = [];
const state: { link: Record<string, unknown> | null; partner: Record<string, unknown> | null; createUser: { data: { user: { id: string } | null }; error: { message: string } | null }; rpc: { data: string | null; error: { message: string } | null } } = {
  link: null,
  partner: null,
  createUser: { data: { user: { id: "user-1" } }, error: null },
  rpc: { data: "org-1", error: null },
};
function table(name: string) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  Object.assign(q, {
    select: chain, eq: (col: string, v: unknown) => { q.filter = { col, v }; return q; }, in: chain,
    maybeSingle: async () => ({ data: name === "access_links" && !q.inserted ? state.link : name === "targets" && q.inserted ? { id: "target-1" } : name === "partner_applications" ? state.partner : null }),
    update: (payload: unknown) => { writes.push({ table: name, op: "update", payload }); return q; },
    insert: (payload: unknown) => { writes.push({ table: name, op: "insert", payload }); q.inserted = true; return q; },
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
const openLink = () => ({ id: "link-1", token: TOKEN, email: "Lead@Example.com", company: "Example Co", calls: 25, days: 21, claimed_at: null, revoked_at: null, draft: null, expires_at: new Date(Date.now() + 86_400_000).toISOString() });
const DRAFT = {
  company_description: "Example Co sells renewals software to procurement teams.",
  product_description: "A renewals desk that chases contract owners before auto-renew dates.",
  ideal_customer_profile: "Heads of procurement at 200 to 2,000 person companies.",
  target: { name: "Dana Whitfield", title: "Head of Procurement", company: "Northwind Freight", industry: "Logistics", company_size: "500 to 1,000 employees", persona_notes: "Busy, direct.", pain_points: ["missed auto-renewals"], objections: ["We have a spreadsheet for that."], voice_id: "not-a-real-voice" },
};

describe("linkStatus", () => {
  it("reads the row", () => {
    expect(linkStatus(openLink())).toBe("open");
    expect(linkStatus({ ...openLink(), claimed_at: "2026-11-01" })).toBe("claimed");
    expect(linkStatus({ ...openLink(), revoked_at: "2026-11-01" })).toBe("revoked");
    expect(linkStatus({ ...openLink(), expires_at: "2020-01-01" })).toBe("expired");
  });
});

describe("claimAccessLink", () => {
  beforeEach(() => { writes.length = 0; state.link = openLink(); state.partner = null; state.createUser = { data: { user: { id: "user-1" } }, error: null }; state.rpc = { data: "org-1", error: null }; });

  it("creates the user, the workspace with the link's allowance, the prospects, and marks the link claimed", async () => {
    const r = await claimAccessLink(TOKEN, { password: "hunter22hunter", fullName: "Sam" });
    expect(r).toEqual({ ok: true, email: "lead@example.com", orgId: "org-1", targetId: null });
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

  it("applies the website draft: context on the workspace and the drafted buyer as the first target", async () => {
    state.link = { ...openLink(), draft: DRAFT };
    const r = await claimAccessLink(TOKEN, { password: "hunter22hunter" });
    expect(r).toMatchObject({ ok: true, targetId: "target-1" });
    const orgUpdates = writes.filter((w) => w.table === "organizations").map((w) => w.payload as Record<string, unknown>);
    expect(orgUpdates.some((u) => u.company_description === DRAFT.company_description && u.ideal_customer_profile === DRAFT.ideal_customer_profile)).toBe(true);
    const targetInserts = writes.filter((w) => w.table === "targets").map((w) => w.payload);
    const drafted = targetInserts.find((t) => !Array.isArray(t)) as Record<string, unknown>;
    expect(drafted).toMatchObject({ name: "Dana Whitfield", org_id: "org-1", created_by: "user-1", kind: "practice", voice_id: null });
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
  it("marks a founding partner's workspace and seats every pilot rep plus the manager", async () => {
    state.partner = { id: "pa-1", sdr_count: 4, status: "approved" };
    const r = await claimAccessLink(TOKEN, { password: "hunter22hunter" });
    expect(r).toMatchObject({ ok: true, orgId: "org-1" });
    const orgUpdates = writes.filter((w) => w.table === "organizations" && w.op === "update").map((w) => w.payload as Record<string, unknown>);
    const partnerUpdate = orgUpdates.find((u) => "seat_limit" in u)!;
    expect(partnerUpdate.seat_limit).toBe(5);
    expect(typeof partnerUpdate.partner_since).toBe("string");
  });

  it("gives a released partner the seats but not the founding price", async () => {
    state.partner = { id: "pa-1", sdr_count: 3, status: "released" };
    await claimAccessLink(TOKEN, { password: "hunter22hunter" });
    const partnerUpdate = writes.filter((w) => w.table === "organizations" && w.op === "update").map((w) => w.payload as Record<string, unknown>).find((u) => "seat_limit" in u)!;
    expect(partnerUpdate).toEqual({ seat_limit: 4 });
  });

  it("leaves an ordinary link's workspace alone", async () => {
    await claimAccessLink(TOKEN, { password: "hunter22hunter" });
    expect(writes.filter((w) => w.table === "organizations" && w.op === "update").some((w) => "seat_limit" in (w.payload as object))).toBe(false);
  });
});
