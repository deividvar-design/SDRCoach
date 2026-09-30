import "server-only";
import { MIN_REVIEWED_FOR_AVG } from "@/lib/stats/progress";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ScoreDimensions, ScoreObjection } from "@/types/database";
import { OBJECTIONS, RUBRIC, RUBRIC_KEYS, type ObjectionKind, type RubricKey } from "@/lib/scoring/rubric";

export interface WeeklyDigest {
  calls: number;
  reviewed: number;
  booked: number;
  avg: number | null;
  topRep: { name: string; avg: number; calls: number } | null;
  weakest: { label: string; avg: number } | null;
  objection: { label: string; count: number; clean: number; coaching: string } | null;
  unreviewed: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** The numbers behind the Monday email: last seven days for one workspace. */
export async function buildWeeklyDigest(db: SupabaseClient<Database>, orgId: string, now = Date.now()): Promise<WeeklyDigest> {
  const since = new Date(now - 7 * 86_400_000).toISOString();
  const { data } = await db
    .from("call_sessions")
    .select("id, user_id, status, outcome, profiles(full_name), call_scores(overall, dimensions, objections)")
    .eq("org_id", orgId)
    .gte("created_at", since)
    .not("started_at", "is", null)
    .neq("status", "failed")
    .limit(1000);
  const rows = data ?? [];
  const scored = rows.filter((r) => r.call_scores);

  const byRep = new Map<string, { name: string; scores: number[]; calls: number }>();
  for (const r of rows) {
    const e = byRep.get(r.user_id) ?? { name: r.profiles?.full_name ?? "Rep", scores: [], calls: 0 };
    e.calls += 1;
    if (r.call_scores?.overall != null) e.scores.push(r.call_scores.overall);
    byRep.set(r.user_id, e);
  }
  // Top of the board needs enough reviews to mean something; reps choose what to review.
  const top = [...byRep.values()].filter((e) => e.scores.length >= MIN_REVIEWED_FOR_AVG).map((e) => ({ name: e.name, avg: avg(e.scores), calls: e.calls })).filter((e): e is { name: string; avg: number; calls: number } => e.avg != null).sort((a, b) => b.avg - a.avg)[0] ?? null;

  const dims = RUBRIC_KEYS.map((k) => ({ key: k as RubricKey, avg: avg(scored.map((r) => (r.call_scores!.dimensions as ScoreDimensions)[k].score)) })).filter((d): d is { key: RubricKey; avg: number } => d.avg != null).sort((a, b) => a.avg - b.avg);

  const objections = new Map<ObjectionKind, { count: number; clean: number }>();
  for (const r of scored) {
    for (const o of (r.call_scores!.objections ?? []) as ScoreObjection[]) {
      const kind = (o.kind in OBJECTIONS ? o.kind : "other") as ObjectionKind;
      const e = objections.get(kind) ?? { count: 0, clean: 0 };
      e.count += 1;
      if (o.handled === "handled") e.clean += 1;
      objections.set(kind, e);
    }
  }
  const worst = [...objections.entries()].filter(([k, v]) => v.count >= 2 && k !== "other").sort((a, b) => a[1].clean / a[1].count - b[1].clean / b[1].count || b[1].count - a[1].count)[0] ?? null;

  return {
    calls: rows.length,
    reviewed: scored.length,
    booked: rows.filter((r) => r.outcome === "meeting_booked").length,
    avg: avg(scored.map((r) => r.call_scores!.overall)),
    topRep: top,
    weakest: dims[0] ? { label: RUBRIC[dims[0].key].label, avg: dims[0].avg } : null,
    objection: worst ? { label: OBJECTIONS[worst[0]].label, count: worst[1].count, clean: worst[1].clean, coaching: OBJECTIONS[worst[0]].coaching } : null,
    unreviewed: rows.filter((r) => r.status === "collected" && r.outcome !== "incomplete").length,
  };
}
