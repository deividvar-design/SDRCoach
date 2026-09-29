import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { finalizeCall } from "./finalize";

const MIN = 60_000;

export interface SweepResult {
  failed: number;
  finalized: number;
  /** Sessions that still need finalizing when `deferFinalize` was set. */
  pending: string[];
}

/**
 * Repairs sessions that never reached a terminal state. Cheap status repairs run inline; the slow
 * part (fetching transcripts, scoring) runs here too unless the caller asks to defer it.
 *  - created and never connected → failed
 *  - live longer than the agent's maximum → ended, then finalize
 *  - scoring for too long (worker died) → ended, then finalize
 *  - ended but never collected → finalize
 *  - collected with a review requested but never scored → finalize
 * Safe to run often; finalizeCall is idempotent.
 */
export async function sweepStaleSessions(
  db: SupabaseClient<Database>,
  opts: { userId?: string; now?: number; deferFinalize?: boolean; limit?: number } = {},
): Promise<SweepResult> {
  const now = opts.now ?? Date.now();
  const iso = (ms: number) => new Date(now - ms).toISOString();
  const scope = <T extends { eq: (col: string, v: string) => T }>(q: T) => (opts.userId ? q.eq("user_id", opts.userId) : q);
  const limit = opts.limit ?? 20;

  const results: SweepResult = { failed: 0, finalized: 0, pending: [] };

  const { data: created } = await scope(db.from("call_sessions").select("id").eq("status", "created").lt("created_at", iso(15 * MIN)));
  if (created?.length) {
    await db.from("call_sessions").update({ status: "failed", error: "The call never connected" }).in("id", created.map((r) => r.id));
    results.failed += created.length;
  }

  const [{ data: stuckLive }, { data: stuckScoring }] = await Promise.all([
    scope(db.from("call_sessions").select("id").eq("status", "live").lt("started_at", iso(20 * MIN))),
    scope(db.from("call_sessions").select("id").eq("status", "scoring").lt("ended_at", iso(10 * MIN))),
  ]);
  const moved = [...(stuckLive ?? []), ...(stuckScoring ?? [])].map((r) => r.id);
  if (moved.length) await db.from("call_sessions").update({ status: "ended", ended_at: new Date(now).toISOString() }).in("id", moved);

  const [{ data: ended }, { data: unscored }] = await Promise.all([
    scope(db.from("call_sessions").select("id").eq("status", "ended").lt("ended_at", iso(5 * MIN)).lt("finalize_attempts", 5).limit(limit)),
    scope(db.from("call_sessions").select("id").eq("status", "collected").not("review_requested_at", "is", null).lt("review_requested_at", iso(2 * MIN)).lt("finalize_attempts", 5).limit(limit)),
  ]);
  const ids = [...new Set([...moved, ...(ended ?? []).map((r) => r.id), ...(unscored ?? []).map((r) => r.id)])].slice(0, limit);

  if (opts.deferFinalize) {
    results.pending = ids;
    return results;
  }
  for (const id of ids) {
    try {
      await finalizeCall(id);
      results.finalized += 1;
    } catch (err) {
      console.error("sweep finalize failed", id, err);
    }
  }
  return results;
}
