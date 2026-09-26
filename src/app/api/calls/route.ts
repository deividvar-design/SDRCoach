import { NextResponse } from "next/server";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mintConversationToken, agentId } from "@/lib/elevenlabs/client";
import { buildPersonaPrompt, firstMessage } from "@/lib/prompts/persona";
import { loadOrgDigests } from "@/lib/knowledge/digest";

const Body = z.object({
  targetId: z.string().uuid(),
  difficulty: z.enum(["warm", "inbound", "cold"]),
  assignmentId: z.string().uuid().nullable().optional(),
});

/** Create a call session and mint the browser's WebRTC token. */
export async function POST(request: Request) {
  const viewer = await requireViewer();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const supabase = await createClient();
  const { data: target } = await supabase.from("targets").select("*").eq("id", parsed.data.targetId).eq("org_id", viewer.org.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  let token: string;
  try {
    token = await mintConversationToken();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Voice service unavailable" }, { status: 503 });
  }

  const digests = await loadOrgDigests(viewer.org.id);
  const repName = viewer.profile.full_name ?? "the rep";
  const prompt = buildPersonaPrompt({ target, difficulty: parsed.data.difficulty, org: viewer.org, digests, repName });

  const { data: session, error } = await supabase
    .from("call_sessions")
    .insert({
      org_id: viewer.org.id,
      user_id: viewer.userId,
      target_id: target.id,
      assignment_id: parsed.data.assignmentId ?? null,
      difficulty: parsed.data.difficulty,
      elevenlabs_agent_id: agentId(),
      status: "created",
    })
    .select("id")
    .single();
  if (error || !session) return NextResponse.json({ error: error?.message ?? "Could not create session" }, { status: 500 });

  return NextResponse.json({
    sessionId: session.id,
    token,
    overrides: {
      prompt,
      firstMessage: firstMessage({ target, difficulty: parsed.data.difficulty }),
      voiceId: target.voice_id,
    },
    prospect: { name: target.name, title: target.title, company: target.company },
  });
}
