import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { elevenlabs } from "@/lib/elevenlabs/client";

/** Streams the call recording from ElevenLabs. RLS on call_sessions decides who may listen. */
export async function GET(_request: Request, { params }: RouteContext<"/api/calls/[id]/audio">) {
  const { id } = await params;
  await requireViewer();
  const supabase = await createClient();
  const { data: session } = await supabase.from("call_sessions").select("elevenlabs_conversation_id, status").eq("id", id).maybeSingle();
  if (!session?.elevenlabs_conversation_id) return NextResponse.json({ error: "No recording" }, { status: 404 });
  // The conversation id comes from the browser. A transcript is stored only after the conversation's prompt matched
  // the one this session issued, so without one the id is unproven and the recording stays unplayed.
  const { data: verified } = await supabase.from("call_transcripts").select("session_id").eq("session_id", id).maybeSingle();
  if (!verified) return NextResponse.json({ error: "No recording" }, { status: 404 });

  try {
    const stream = await (await elevenlabs()).conversationalAi.conversations.audio.get(session.elevenlabs_conversation_id);
    return new Response(stream, {
      headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600" },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Recording unavailable" }, { status: 502 });
  }
}
