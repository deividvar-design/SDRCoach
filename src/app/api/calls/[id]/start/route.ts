import { NextResponse } from "next/server";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** The browser connected. Record the ElevenLabs conversation id so the server can fetch the transcript later. */
export async function POST(request: Request, { params }: RouteContext<"/api/calls/[id]/start">) {
  const { id } = await params;
  const viewer = await requireViewer();
  const body = z.object({ conversationId: z.string().min(1).max(200) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  // Only the session's own rep can start it, and only once, from `created`.
  const { data, error } = await createAdminClient()
    .from("call_sessions")
    .update({ status: "live", elevenlabs_conversation_id: body.data.conversationId, started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", viewer.userId)
    .eq("status", "created")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Session is not waiting to start" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
