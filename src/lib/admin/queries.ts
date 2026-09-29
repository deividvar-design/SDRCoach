import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialStatus } from "@/lib/billing/trial";
import type { Organization, UsageEvent } from "@/types/database";

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

export interface OrgRow {
  org: Organization;
  members: number;
  ownerEmail: string | null;
  calls30d: number;
  connected30d: number;
  cost30d: number;
  trial: ReturnType<typeof trialStatus>;
  lastCallAt: string | null;
}

/** PostgREST returns at most 1,000 rows per request; walk the pages. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>, size = 1000, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += size) {
    const { data } = await page(from, from + size - 1);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

export async function loadOverview() {
  const db = createAdminClient();
  const since30 = iso(30 * DAY);
  const [{ data: orgs }, memberships, sessions, usage] = await Promise.all([
    db.from("organizations").select("*").order("created_at", { ascending: false }).limit(1000),
    fetchAll((a, b) => db.from("memberships").select("org_id, user_id, role").range(a, b)),
    fetchAll((a, b) => db.from("call_sessions").select("id, org_id, status, started_at, created_at").gte("created_at", since30).range(a, b)),
    fetchAll((a, b) => db.from("usage_events").select("*").gte("created_at", since30).range(a, b)),
  ]);

  const allOrgs = orgs ?? [];
  const sess = sessions;
  const use = usage as UsageEvent[];

  // Owner emails (one auth lookup per org; fine at this scale).
  const owners = new Map<string, string>();
  await Promise.all(
    memberships
      .filter((m) => m.role === "owner")
      .map(async (m) => {
        const { data } = await db.auth.admin.getUserById(m.user_id);
        if (data.user?.email) owners.set(m.org_id, data.user.email);
      }),
  );

  const connectedAll = new Map<string, number>();
  const connectedRows = await fetchAll((a, b) => db.from("call_sessions").select("org_id").not("started_at", "is", null).neq("status", "failed").range(a, b));
  for (const r of connectedRows) connectedAll.set(r.org_id, (connectedAll.get(r.org_id) ?? 0) + 1);

  const rows: OrgRow[] = allOrgs.map((org) => {
    const s = sess.filter((x) => x.org_id === org.id);
    const u = use.filter((x) => x.org_id === org.id);
    return {
      org,
      members: memberships.filter((m) => m.org_id === org.id).length,
      ownerEmail: owners.get(org.id) ?? null,
      calls30d: s.length,
      connected30d: s.filter((x) => x.started_at).length,
      cost30d: u.reduce((a, b) => a + Number(b.cost_usd), 0),
      trial: trialStatus(org, connectedAll.get(org.id) ?? 0),
      lastCallAt: s.map((x) => x.created_at).sort().at(-1) ?? null,
    };
  });

  const daily = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(Date.now() - (29 - i) * DAY);
    const key = day.toISOString().slice(0, 10);
    return {
      key,
      label: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      calls: sess.filter((x) => x.created_at.slice(0, 10) === key).length,
      cost: use.filter((x) => x.created_at.slice(0, 10) === key).reduce((a, b) => a + Number(b.cost_usd), 0),
    };
  });

  const tokens = use.reduce(
    (acc, u) => {
      acc.input += u.input_tokens;
      acc.output += u.output_tokens;
      acc.cacheRead += u.cache_read_tokens;
      acc.voiceSeconds += u.seconds;
      if (u.provider === "anthropic") acc.anthropicCost += Number(u.cost_usd);
      else acc.voiceCost += Number(u.cost_usd);
      return acc;
    },
    { input: 0, output: 0, cacheRead: 0, voiceSeconds: 0, anthropicCost: 0, voiceCost: 0 },
  );

  return {
    rows,
    totals: {
      orgs: allOrgs.length,
      trials: allOrgs.filter((o) => o.plan === "trial").length,
      paid: allOrgs.filter((o) => ["starter", "team", "enterprise"].includes(o.plan)).length,
      canceled: allOrgs.filter((o) => o.plan === "canceled").length,
      calls30d: sess.length,
      calls7d: sess.filter((x) => x.created_at >= iso(7 * DAY)).length,
      connected30d: sess.filter((x) => x.started_at).length,
      cost30d: tokens.anthropicCost + tokens.voiceCost,
    },
    tokens,
    daily,
  };
}

export async function loadOrgDetail(orgId: string) {
  const db = createAdminClient();
  const [{ data: org }, { data: members }, { data: sessions }, { data: usage }, { data: actions }, { data: emails }] = await Promise.all([
    db.from("organizations").select("*").eq("id", orgId).maybeSingle(),
    db.from("memberships").select("user_id, role, created_at, profiles!memberships_user_id_fkey(full_name)").eq("org_id", orgId).order("created_at"),
    db.from("call_sessions").select("id, created_at, status, difficulty, outcome, duration_seconds, started_at, user_id, targets(name), call_scores(overall)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(25),
    db.from("usage_events").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(2000),
    db.from("admin_actions").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(20),
    db.from("email_log").select("kind, sent_at").eq("org_id", orgId).order("sent_at", { ascending: false }).limit(20),
  ]);
  if (!org) return null;

  const withEmail = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await db.auth.admin.getUserById(m.user_id);
      return { ...m, email: data.user?.email ?? null };
    }),
  );
  const { count: connected } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", orgId).not("started_at", "is", null);
  const use = usage as UsageEvent[];
  const sum = (list: UsageEvent[]) => ({
    cost: list.reduce((a, b) => a + Number(b.cost_usd), 0),
    input: list.reduce((a, b) => a + b.input_tokens, 0),
    output: list.reduce((a, b) => a + b.output_tokens, 0),
    voiceSeconds: list.reduce((a, b) => a + b.seconds, 0),
  });

  return {
    org,
    members: withEmail,
    sessions: sessions ?? [],
    trial: trialStatus(org, connected ?? 0),
    connected: connected ?? 0,
    usageAll: sum(use),
    usage30d: sum(use.filter((u) => u.created_at >= iso(30 * DAY))),
    actions: actions ?? [],
    emails: emails ?? [],
  };
}
