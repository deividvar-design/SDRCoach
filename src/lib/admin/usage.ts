import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/paginate";
import type { UsageEvent } from "@/types/database";

const DAY = 86_400_000;

export interface UsageDay {
  key: string;
  label: string;
  appCalls: number;
  karenCalls: number;
  minutes: number;
  voiceCost: number;
  scoringCost: number;
  /** For DailyBars: both call kinds together, and the whole cost. */
  calls: number;
  cost: number;
}

export interface RecentCall {
  id: string;
  at: string;
  kind: "app" | "karen";
  who: string;
  orgId: string | null;
  seconds: number;
  outcome: string | null;
  score: number | null;
  cost: number;
  status: string;
}

/**
 * Everything the usage dashboard shows for the last N days: calls of both kinds, minutes and cost per day, the Karen
 * funnel, cost by workspace, and the latest calls. Computed from usage_events, call_sessions and demo_calls.
 */
export async function loadUsage(days: number) {
  const db = createAdminClient();
  const since = new Date(Date.now() - days * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [usage, sessions, demos, { data: orgRows }] = await Promise.all([
    fetchAll((a, b) => db.from("usage_events").select("*").gte("created_at", sinceIso).range(a, b)),
    fetchAll((a, b) => db.from("call_sessions").select("id, org_id, user_id, status, outcome, duration_seconds, started_at, created_at, call_scores(overall), targets(name)").gte("created_at", sinceIso).not("started_at", "is", null).range(a, b)),
    fetchAll((a, b) => db.from("demo_calls").select("id, email, domain, personal_email, status, outcome, overall, duration_seconds, created_at, started_at, method, gclid, gbraid, wbraid, email_added_at, elevenlabs_conversation_id").gte("created_at", sinceIso).range(a, b)),
    db.from("organizations").select("id, name, plan").limit(1000),
  ]);
  const use = usage as UsageEvent[];
  const orgs = new Map((orgRows ?? []).map((o) => [o.id, o]));

  const dayKey = (iso: string) => iso.slice(0, 10);
  const daily = new Map<string, UsageDay>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    daily.set(key, { key, label: d.toLocaleDateString("en-GB", { month: "short", day: "numeric" }), appCalls: 0, karenCalls: 0, minutes: 0, voiceCost: 0, scoringCost: 0, calls: 0, cost: 0 });
  }
  const bump = (key: string, f: (d: UsageDay) => void) => {
    const d = daily.get(key);
    if (d) f(d);
  };
  const connectedDemos = demos.filter((d) => d.elevenlabs_conversation_id);
  for (const s of sessions) bump(dayKey(s.created_at), (d) => (d.appCalls += 1));
  for (const k of connectedDemos) bump(dayKey(k.created_at), (d) => (d.karenCalls += 1));
  for (const u of use) {
    bump(dayKey(u.created_at), (d) => {
      if (u.kind === "voice") {
        d.minutes += u.seconds / 60;
        d.voiceCost += Number(u.cost_usd);
      } else d.scoringCost += Number(u.cost_usd);
    });
  }
  for (const d of daily.values()) {
    d.calls = d.appCalls + d.karenCalls;
    d.cost = d.voiceCost + d.scoringCost;
  }

  const voiceRows = use.filter((u) => u.kind === "voice");
  const totals = {
    appCalls: sessions.length,
    karenCalls: connectedDemos.length,
    minutes: voiceRows.reduce((n, u) => n + u.seconds / 60, 0),
    voiceCost: voiceRows.reduce((n, u) => n + Number(u.cost_usd), 0),
    scoringCost: use.filter((u) => u.kind !== "voice").reduce((n, u) => n + Number(u.cost_usd), 0),
    scoringRuns: use.filter((u) => u.kind === "score").length,
    tokensIn: use.reduce((n, u) => n + u.input_tokens + u.cache_read_tokens, 0),
    tokensOut: use.reduce((n, u) => n + u.output_tokens, 0),
  };
  const totalCalls = totals.appCalls + totals.karenCalls;
  const avgSeconds = voiceRows.length ? voiceRows.reduce((n, u) => n + u.seconds, 0) / voiceRows.length : 0;

  // Karen funnel for the range.
  const scored = demos.filter((d) => d.status === "scored");
  const karen = {
    started: demos.length,
    connected: connectedDemos.length,
    scored: scored.length,
    avgScore: scored.length ? scored.reduce((n, d) => n + Number(d.overall ?? 0), 0) / scored.length : null,
    avgSeconds: connectedDemos.length ? connectedDemos.reduce((n, d) => n + (d.duration_seconds ?? 0), 0) / connectedDemos.length : 0,
    withEmail: demos.filter((d) => d.email).length,
    personal: demos.filter((d) => d.personal_email).length,
    fromAds: demos.filter((d) => d.gclid || d.gbraid || d.wbraid).length,
    rematches: demos.filter((d) => d.method === "rematch").length,
    byMethod: countBy(demos.map((d) => d.method ?? (d.email && !d.email_added_at ? "email" : "call"))),
    byOutcome: countBy(scored.map((d) => d.outcome ?? "unknown")),
    survived: scored.filter((d) => d.outcome === "meeting_booked" || d.outcome === "callback").length,
  };

  // Cost by workspace.
  const byOrg = new Map<string, { id: string; name: string; plan: string; calls: number; minutes: number; cost: number; lastCall: string | null }>();
  for (const s of sessions) {
    const o = orgs.get(s.org_id);
    const row = byOrg.get(s.org_id) ?? { id: s.org_id, name: o?.name ?? "deleted workspace", plan: o?.plan ?? "", calls: 0, minutes: 0, cost: 0, lastCall: null };
    row.calls += 1;
    if (!row.lastCall || s.created_at > row.lastCall) row.lastCall = s.created_at;
    byOrg.set(s.org_id, row);
  }
  for (const u of use) {
    if (!u.org_id) continue;
    const o = orgs.get(u.org_id);
    const row = byOrg.get(u.org_id) ?? { id: u.org_id, name: o?.name ?? "deleted workspace", plan: o?.plan ?? "", calls: 0, minutes: 0, cost: 0, lastCall: null };
    row.cost += Number(u.cost_usd);
    if (u.kind === "voice") row.minutes += u.seconds / 60;
    byOrg.set(u.org_id, row);
  }
  const karenCost = use.filter((u) => u.demo_id).reduce((n, u) => n + Number(u.cost_usd), 0);
  const workspaces = [...byOrg.values()].sort((a, b) => b.cost - a.cost);

  // Latest calls, both kinds.
  const costBySession = new Map<string, number>();
  const costByDemo = new Map<string, number>();
  for (const u of use) {
    if (u.session_id) costBySession.set(u.session_id, (costBySession.get(u.session_id) ?? 0) + Number(u.cost_usd));
    if (u.demo_id) costByDemo.set(u.demo_id, (costByDemo.get(u.demo_id) ?? 0) + Number(u.cost_usd));
  }
  const recent: RecentCall[] = [
    ...sessions.map((s) => ({
      id: s.id,
      at: s.created_at,
      kind: "app" as const,
      who: `${orgs.get(s.org_id)?.name ?? "workspace"}${(s.targets as { name: string } | null)?.name ? ` · ${(s.targets as { name: string }).name}` : ""}`,
      orgId: s.org_id,
      seconds: s.duration_seconds ?? 0,
      outcome: s.outcome,
      score: (s.call_scores as { overall: number } | null)?.overall ?? null,
      cost: costBySession.get(s.id) ?? 0,
      status: s.status,
    })),
    ...connectedDemos.map((d) => ({
      id: d.id,
      at: d.created_at,
      kind: "karen" as const,
      who: d.email ? `Karen · ${d.domain ?? d.email}${d.personal_email ? " (personal)" : ""}` : "Karen · no email left",
      orgId: null,
      seconds: d.duration_seconds ?? 0,
      outcome: d.outcome,
      score: d.overall === null ? null : Number(d.overall),
      cost: costByDemo.get(d.id) ?? 0,
      status: d.status,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 40);

  return { days, daily: [...daily.values()], totals, totalCalls, avgSeconds, karen, karenCost, workspaces, recent };
}

function countBy(values: string[]) {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
