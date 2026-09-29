import { NextResponse, after } from "next/server";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeCall } from "@/lib/calls/finalize";

export const maxDuration = 120;

/** The browser hung up (or lost connection). Mark ended and score in the background. */
export async function POST(_request: Request, { params }: RouteContext<"/api/calls/[id]/end">) {
  const { id } = await params;
  const viewer = await requireViewer();
  const db = createAdminClient();

  const { data: session } = await db.from("call_sessions").select("id, status, elevenlabs_conversation_id").eq("id", id).eq("user_id", viewer.userId).maybeSingle();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.status !== "created" && session.status !== "live") return NextResponse.json({ ok: true, status: session.status });

  if (!session.elevenlabs_conversation_id) {
    await db.from("call_sessions").update({ status: "failed", error: "Call never connected", ended_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true, status: "failed" });
  }

  // Compare-and-set: the pagehide beacon and the SDK disconnect both hit this route. Only the first one finalizes.
  const { data: ended } = await db
    .from("call_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["created", "live"])
    .select("id")
    .maybeSingle();
  if (!ended) return NextResponse.json({ ok: true, status: "ended" });
  after(async () => {
    try {
      await finalizeCall(id);
    } catch (err) {
      console.error("finalizeCall failed", id, err);
    }
  });
  return NextResponse.json({ ok: true, status: "ended" });
}
