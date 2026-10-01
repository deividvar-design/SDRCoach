import { reportError } from "@/lib/sentry";
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mintConversationToken, agentId } from "@/lib/elevenlabs/client";
import { buildPersonaPrompt, firstMessage } from "@/lib/prompts/persona";
import { pickGatekeeper, rollGatekeeper, rollMood } from "@/lib/domain/moods";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepStaleSessions } from "@/lib/calls/sweep";
import { finalizeCall, hashPrompt } from "@/lib/calls/finalize";

const DAILY_CALL_CAP = Number(process.env.CALLS_PER_ORG_PER_DAY ?? 200);

const Body = z.object({
  targetId: z.string().uuid(),
  difficulty: z.enum(["warm", "inbound", "cold"]),
});

/** Create a call session and mint the browser's WebRTC token. */
export async function POST(request: Request) {
  const viewer = await requireViewer();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const supabase = await createClient();
  const { data: target } = await supabase.from("targets").select("*").eq("id", parsed.data.targetId).eq("org_id", viewer.org.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  // Repair this rep's own abandoned sessions before the concurrency check so a failed dial never locks them out.
  // Status repairs are instant; transcript fetches and scoring run after the response.
  if (process.env.SDRCOACH_DEMO !== "1") {
    const swept = await sweepStaleSessions(createAdminClient(), { userId: viewer.userId, deferFinalize: true }).catch(() => null);
    if (swept?.pending.length) {
      after(async () => {
        for (const id of swept.pending) await finalizeCall(id).catch((err) => reportError(err, { where: "deferred_finalize", sessionId: id }));
      });
    }
  }

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

  const trial = await loadTrialStatus(viewer.org);
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

  const repName = viewer.profile.full_name ?? "the rep";
  // Boss fights are always Level 3; nobody gets a warm Karen.
  const difficulty = target.kind === "boss" ? "cold" : parsed.data.difficulty;
  // Dice, rolled once per call so the same target is never the same person twice. No gatekeeper on a boss fight: the boss answers.
  const mood = rollMood(difficulty);
  const gatekeeper = target.kind !== "boss" && rollGatekeeper(difficulty) ? pickGatekeeper(target.voice_id) : null;
  const prompt = buildPersonaPrompt({ target, difficulty, org: viewer.org, repName, mood, gatekeeper, ttsModel: process.env.ELEVENLABS_TTS_MODEL });

  // Sessions are server-owned: reps cannot insert or update rows themselves (migration 0012).
  const { data: session, error } = await createAdminClient()
    .from("call_sessions")
    .insert({
      org_id: viewer.org.id,
      user_id: viewer.userId,
      target_id: target.id,
      difficulty,
      elevenlabs_agent_id: agentId(),
      status: "created",
      prompt_hash: hashPrompt(prompt),
      mood: mood.id,
      gatekeeper: Boolean(gatekeeper),
    })
    .select("id")
    .single();
  if (error?.code === "23505") return NextResponse.json({ error: "You already have a call in progress. Hang up before dialing again." }, { status: 409 });
  if (error || !session) return NextResponse.json({ error: error?.message ?? "Could not create session" }, { status: 500 });

  return NextResponse.json({
    sessionId: session.id,
    token,
    overrides: {
      prompt,
      firstMessage: firstMessage({ target, difficulty, gatekeeper }),
      voiceId: target.voice_id,
    },
    prospect: { name: target.name, title: target.title, company: target.company },
    ambience: mood.ambience,
    gatekeeper: gatekeeper ? { name: gatekeeper.name, voiceLabel: gatekeeper.voiceLabel } : null,
  });
}
