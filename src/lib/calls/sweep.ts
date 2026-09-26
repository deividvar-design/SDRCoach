import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { finalizeCall } from "./finalize";

const MIN = 60_000;

/**
 * Repairs sessions that never reached a terminal state:
 *  - created and never connected → failed
 *  - live longer than the agent's maximum → finalize (the recording exists)
 *  - scoring for too long (worker died) → back to ended and finalize
 *  - ended but never scored → finalize
 * Safe to run often; finalizeCall is idempotent.
 */
export async function sweepStaleSessions(db: SupabaseClient<Database>, opts: { userId?: string; now?: number } = {}) {
  const now = opts.now ?? Date.now();
  const iso = (ms: number) => new Date(now - ms).toISOString();
  const scope = <T extends { eq: (col: string, v: string) => T }>(q: T) => (opts.userId ? q.eq("user_id", opts.userId) : q);

  const results = { failed: 0, finalized: 0 };

  const { data: created } = await scope(db.from("call_sessions").select("id").eq("status", "created").lt("created_at", iso(15 * MIN)));
  if (created?.length) {
    await db.from("call_sessions").update({ status: "failed", error: "Call never connected" }).in("id", created.map((r) => r.id));
    results.failed += created.length;
  }

  const { data: stuckScoring } = await scope(db.from("call_sessions").select("id").eq("status", "scoring").lt("ended_at", iso(10 * MIN)));
  if (stuckScoring?.length) await db.from("call_sessions").update({ status: "ended" }).in("id", stuckScoring.map((r) => r.id));

  const [{ data: live }, { data: ended }] = await Promise.all([
    scope(db.from("call_sessions").select("id").eq("status", "live").lt("started_at", iso(20 * MIN))),
    scope(db.from("call_sessions").select("id").eq("status", "ended").lt("ended_at", iso(5 * MIN))),
  ]);
  for (const row of [...(live ?? []), ...(ended ?? []), ...(stuckScoring ?? [])]) {
    try {
      await finalizeCall(row.id);
      results.finalized += 1;
    } catch (err) {
      console.error("sweep finalize failed", row.id, err);
    }
  }
  return results;
}
