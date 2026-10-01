import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentDemo } from "@/lib/demo/session";
import { DEMO_MAX_SECONDS, finalizeDemo } from "@/lib/demo/boss";
import { reportError } from "@/lib/sentry";

export const maxDuration = 120;

const STALE_SCORING_MS = 4 * 60_000;
/** A call still "live" this long after it started never reached /end: treat it as ended. */
const STALE_LIVE_MS = (DEMO_MAX_SECONDS + 90) * 1000;

/** Retry for a demo whose hang-up never arrived or whose scoring worker died. Called by the result page while it polls. */
export async function POST() {
  const demo = await currentDemo();
  if (!demo) return NextResponse.json({ error: "No demo" }, { status: 401 });
  const now = Date.now();
  const startedAt = demo.started_at ? new Date(demo.started_at).getTime() : 0;
  const scoringSince = demo.scoring_started_at ? new Date(demo.scoring_started_at).getTime() : 0;
  const staleLive = demo.status === "live" && startedAt > 0 && now - startedAt > STALE_LIVE_MS;
  const staleScoring = demo.status === "scoring" && now - scoringSince > STALE_SCORING_MS;
  if (!staleLive && !staleScoring && demo.status !== "ended") return NextResponse.json({ ok: true, status: demo.status });

  const db = createAdminClient();
  if (staleLive) await db.from("demo_calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", demo.id).eq("status", "live");
  if (staleScoring) await db.from("demo_calls").update({ status: "ended" }).eq("id", demo.id).eq("status", "scoring");
  after(async () => {
    await finalizeDemo(demo.id).catch((err) => reportError(err, { where: "demo_retry_finalize", extra: { demoId: demo.id } }));
  });
  return NextResponse.json({ ok: true, status: "scoring" });
}
