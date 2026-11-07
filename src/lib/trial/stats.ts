import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { RepStats } from "@/content/trial-growth";

type Db = ReturnType<typeof createAdminClient>;

/** A rep's scored calls in a workspace, first against last, and the latest thing the coach told them to fix. */
export async function repStats(db: Db, orgId: string, userId: string): Promise<RepStats> {
  const { data } = await db
    .from("call_sessions")
    .select("created_at, boss, call_scores(overall, improvements)")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "scored")
    .eq("boss", false)
    .order("created_at")
    .limit(200);
  type Row = { created_at: string; call_scores: { overall: number; improvements: string[] } | { overall: number; improvements: string[] }[] | null };
  const scored = ((data ?? []) as unknown as Row[]).map((r) => (Array.isArray(r.call_scores) ? r.call_scores[0] : r.call_scores)).filter((s): s is { overall: number; improvements: string[] } => Boolean(s));
  const one = (n: number) => Math.round(n * 10) / 10;
  const first = scored[0];
  const last = scored[scored.length - 1];
  return {
    calls: scored.length,
    firstAvg: first ? one(Number(first.overall)) : null,
    lastAvg: last ? one(Number(last.overall)) : null,
    topFix: last?.improvements?.[0] ?? null,
  };
}
