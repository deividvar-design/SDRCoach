import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentDemo } from "@/lib/demo/session";
import { finalizeDemo } from "@/lib/demo/boss";
import { reportError } from "@/lib/sentry";

export const maxDuration = 120;

const STALE_MS = 4 * 60_000;

/** Retry for a demo whose scoring worker died. Called by the result page while it polls. */
export async function POST() {
  const demo = await currentDemo();
  if (!demo) return NextResponse.json({ error: "No demo" }, { status: 401 });
  const endedAt = demo.ended_at ? new Date(demo.ended_at).getTime() : 0;
  const stale = (demo.status === "scoring" || demo.status === "ended") && Date.now() - endedAt > STALE_MS;
  if (!stale) return NextResponse.json({ ok: true, status: demo.status });
  await createAdminClient().from("demo_calls").update({ status: "ended" }).eq("id", demo.id).eq("status", "scoring");
  after(async () => {
    await finalizeDemo(demo.id).catch((err) => reportError(err, { where: "demo_retry_finalize", extra: { demoId: demo.id } }));
  });
  return NextResponse.json({ ok: true, status: "scoring" });
}
