import { NextResponse } from "next/server";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mintConversationToken, agentId } from "@/lib/elevenlabs/client";
import { buildPersonaPrompt, firstMessage } from "@/lib/prompts/persona";
import { loadOrgDigests } from "@/lib/knowledge/digest";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepStaleSessions } from "@/lib/calls/sweep";

const DAILY_CALL_CAP = Number(process.env.CALLS_PER_ORG_PER_DAY ?? 200);

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

  if (parsed.data.assignmentId) {
    const { data: assignment } = await supabase.from("assignments").select("id").eq("id", parsed.data.assignmentId).eq("assigned_to", viewer.userId).eq("org_id", viewer.org.id).maybeSingle();
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Repair this rep's own abandoned sessions before the concurrency check so a failed dial never locks them out.
  if (process.env.SDRCOACH_DEMO !== "1") await sweepStaleSessions(createAdminClient(), { userId: viewer.userId }).catch(() => {});

  // Guardrails: one live call per rep, and a daily cap per org so a runaway client cannot burn the voice budget.
  const staleCutoff = new Date(Date.now() - 20 * 60_000).toISOString();
  const [{ count: liveCount }, { count: todayCount }] = await Promise.all([
    supabase
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewer.userId)
      .in("status", ["created", "live"])
      .gt("created_at", staleCutoff),
    supabase
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", viewer.org.id)
      .gt("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString()),
  ]);
  if ((liveCount ?? 0) > 0) return NextResponse.json({ error: "You already have a call in progress. Hang up before dialing again." }, { status: 409 });

  const trial = await loadTrialStatus(supabase, viewer.org);
  if (trial.exhausted) {
    return NextResponse.json(
      { error: trial.reason === "calls" ? "Your team has used all its trial calls." : trial.reason === "subscription" ? "Your team's subscription has ended." : "Your team's trial has ended.", code: "trial_exhausted" },
      { status: 402 },
    );
  }
  if ((todayCount ?? 0) >= DAILY_CALL_CAP) return NextResponse.json({ error: "Your team has reached today's call limit. Try again tomorrow." }, { status: 429 });

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
