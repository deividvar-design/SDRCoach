import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentDemo } from "@/lib/demo/session";
import { finalizeDemo } from "@/lib/demo/boss";
import { reportError } from "@/lib/sentry";

export const maxDuration = 120;

/** The browser hung up. Mark ended and score in the background. */
export async function POST() {
  const demo = await currentDemo();
  if (!demo) return NextResponse.json({ error: "No demo" }, { status: 401 });
  if (demo.status !== "created" && demo.status !== "dialing" && demo.status !== "live") return NextResponse.json({ ok: true, status: demo.status });
  const db = createAdminClient();
  if (!demo.elevenlabs_conversation_id) {
    await db.from("demo_calls").update({ status: "failed", error: "Call never connected", ended_at: new Date().toISOString() }).eq("id", demo.id);
    return NextResponse.json({ ok: true, status: "failed" });
  }
  const { data: ended } = await db.from("demo_calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", demo.id).in("status", ["created", "dialing", "live"]).select("id").maybeSingle();
  if (!ended) return NextResponse.json({ ok: true, status: "ended" });
  after(async () => {
    await finalizeDemo(demo.id).catch((err) => reportError(err, { where: "demo_end_finalize", extra: { demoId: demo.id } }));
  });
  return NextResponse.json({ ok: true, status: "ended" });
}
