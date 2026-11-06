import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PARTNER } from "@/content/founding-partners";
import type { PartnerApplication, PartnerReport } from "@/types/database";

type Db = ReturnType<typeof createAdminClient>;

/** Approved and completed pilots hold a spot; pending, rejected and released ones do not. */
export async function spotsLeft(db: Db = createAdminClient()) {
  const { count } = await db.from("partner_applications").select("id", { count: "exact", head: true }).in("status", ["approved", "completed"]);
  return Math.max(0, PARTNER.spots - (count ?? 0));
}

/** Whether a workspace checks out at the founding price because it came through the program. */
export function isPartnerOrg(org: { partner_since: string | null }) {
  return Boolean(org.partner_since);
}

export function partnerReport(app: Pick<PartnerApplication, "report">): PartnerReport | null {
  const r = app.report;
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  return typeof (r as Partial<PartnerReport>).calls === "number" ? (r as unknown as PartnerReport) : null;
}

const DAY = 86_400_000;
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/**
 * The day-30 report from the partner's own scored calls: the first seven days against the last seven, overall and
 * on objection handling, plus volume. Boss-fight calls are left out, as they are from every other average.
 */
export async function buildPartnerReport(db: Db, orgId: string, startedAt: string, now = Date.now()): Promise<PartnerReport> {
  const start = new Date(startedAt).getTime();
  const { data: rows } = await db
    .from("call_sessions")
    .select("user_id, started_at, boss, call_scores(overall, dimensions)")
    .eq("org_id", orgId)
    .eq("status", "scored")
    .eq("boss", false)
    .gte("started_at", new Date(start).toISOString())
    .limit(2000);
  type Row = { user_id: string; started_at: string | null; call_scores: { overall: number; dimensions: { objection_handling?: { score: number } } } | { overall: number; dimensions: { objection_handling?: { score: number } } }[] | null };
  const calls = ((rows ?? []) as unknown as Row[])
    .map((r) => ({ user: r.user_id, at: new Date(r.started_at ?? 0).getTime(), score: Array.isArray(r.call_scores) ? r.call_scores[0] : r.call_scores }))
    .filter((c): c is { user: string; at: number; score: NonNullable<typeof c.score> } => Boolean(c.score));
  const first = calls.filter((c) => c.at < start + 7 * DAY);
  const last = calls.filter((c) => c.at >= now - 7 * DAY);
  const reps = new Set(calls.map((c) => c.user)).size;
  return {
    calls: calls.length,
    reps,
    callsPerRep: reps ? Math.round((calls.length / reps) * 10) / 10 : 0,
    firstWeekAvg: avg(first.map((c) => Number(c.score.overall))),
    lastWeekAvg: avg(last.map((c) => Number(c.score.overall))),
    objectionFirst: avg(first.map((c) => c.score.dimensions?.objection_handling?.score).filter((n): n is number => typeof n === "number")),
    objectionLast: avg(last.map((c) => c.score.dimensions?.objection_handling?.score).filter((n): n is number => typeof n === "number")),
    firstWeekCalls: first.length,
    lastWeekCalls: last.length,
    computedAt: new Date(now).toISOString(),
  };
}

/** The report as a few plain sentences, for the email and the review page. Missing numbers are left out, not guessed. */
export function reportSummary(r: PartnerReport): string[] {
  const lines = [`${r.calls} scored ${r.calls === 1 ? "call" : "calls"} from ${r.reps} ${r.reps === 1 ? "rep" : "reps"}, ${r.callsPerRep} per rep.`];
  if (r.firstWeekAvg !== null && r.lastWeekAvg !== null) lines.push(`Average score: ${r.firstWeekAvg} out of 10 in the first week, ${r.lastWeekAvg} in the last week.`);
  else if (r.firstWeekAvg !== null) lines.push(`Average score in the first week: ${r.firstWeekAvg} out of 10. Too few calls in the last week to compare.`);
  if (r.objectionFirst !== null && r.objectionLast !== null) lines.push(`Objection handling: ${r.objectionFirst} in the first week, ${r.objectionLast} in the last.`);
  return lines;
}
