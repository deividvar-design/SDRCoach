import { NextResponse, after } from "next/server";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { finalizeCall } from "@/lib/calls/finalize";

/** The browser hung up (or lost connection). Mark ended and score in the background. */
export async function POST(_request: Request, { params }: RouteContext<"/api/calls/[id]/end">) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("call_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", viewer.userId)
    .in("status", ["created", "live"])
    .select("id, elevenlabs_conversation_id")
    .maybeSingle();

  if (session?.elevenlabs_conversation_id) {
    after(async () => {
      try {
        await finalizeCall(id);
      } catch (err) {
        console.error("finalizeCall failed", id, err);
      }
    });
  } else if (session) {
    await supabase.from("call_sessions").update({ status: "failed", error: "Call never connected" }).eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
