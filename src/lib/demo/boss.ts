import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { buildPersonaPrompt, firstMessage } from "@/lib/prompts/persona";
import { MOODS } from "@/lib/domain/moods";
import { fetchConversation } from "@/lib/elevenlabs/client";
import { computeMetrics } from "@/lib/scoring/metrics";
import { scoreCall } from "@/lib/scoring/score";
import { hashPrompt } from "@/lib/calls/finalize";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { reportError } from "@/lib/sentry";
import { track } from "@vercel/analytics/server";
import type { CallOutcome, DemoCall, TranscriptTurn } from "@/types/database";
import { absoluteUrl } from "@/lib/site";

/** The public demo always dials Karen. */
export const KAREN = { ...BOSS_PERSONAS[0], pain_points: [...BOSS_PERSONAS[0].pain_points], objections: [...BOSS_PERSONAS[0].objections], kind: "boss" as const };

/** Hard cap on a demo call. The browser hangs up here; the server ignores anything that somehow ran much longer. */
export const DEMO_MAX_SECONDS = 180;

const OUTCOMES: CallOutcome[] = ["meeting_booked", "callback", "info_sent", "rejected", "hung_up", "incomplete"];
const DAY = 86_400_000;

/** Limits that keep a viral day from becoming a voice bill. Per-email is forever, the rest are per day. */
export const DEMO_LIMITS = {
  perEmail: 1,
  perDomainPerDay: 3,
  perIpPerDay: 5,
  globalPerDay: Number(process.env.DEMO_DAILY_CAP ?? 50),
};

type Db = ReturnType<typeof createAdminClient>;

/** "acme.co.uk" becomes "Acme": the only thing the demo knows about the caller's company. */
export function companyFromDomain(domain: string) {
  const label = domain.split(".")[0] ?? domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Limits count calls that actually minted a voice token (prompt_hash set). Waitlisted rows, abandoned forms and
 * mic-denied attempts never count, so a failed first try is not a lifetime ban.
 */
export async function checkDemoLimits(db: Db, { email, domain, ip }: { email: string; domain: string; ip: string | null }): Promise<string | null> {
  const since = new Date(Date.now() - DAY).toISOString();
  const count = async (q: ReturnType<Db["from"]>) => (await q).count ?? 0;
  const minted = () => db.from("demo_calls").select("id", { count: "exact", head: true }).not("prompt_hash", "is", null);
  const [byEmail, byDomain, byIp, global] = await Promise.all([
    count(minted().eq("email", email)),
    count(minted().eq("domain", domain).gte("created_at", since)),
    ip ? count(minted().eq("ip", ip).gte("created_at", since)) : Promise.resolve(0),
    count(minted().gte("created_at", since)),
  ]);
  if (byEmail >= DEMO_LIMITS.perEmail) return "already_played";
  if (byDomain >= DEMO_LIMITS.perDomainPerDay) return "domain_limit";
  if (byIp >= DEMO_LIMITS.perIpPerDay) return "ip_limit";
  if (global >= DEMO_LIMITS.globalPerDay) return "busy";
  return null;
}

/** Karen's brief for a caller we know only by their company name. */
export function demoPrompt(demo: Pick<DemoCall, "email" | "domain">) {
  const org = { name: companyFromDomain(demo.domain), company_description: null, product_description: null, ideal_customer_profile: null };
  const repName = demo.email.split("@")[0]?.split(/[._-]/)[0] ?? "the rep";
  const mood = MOODS.find((m) => m.id === "plain")!;
  const prompt = buildPersonaPrompt({ target: KAREN, difficulty: "cold", org, repName: capitalise(repName), mood, gatekeeper: null, ttsModel: process.env.ELEVENLABS_TTS_MODEL });
  return { prompt, firstMessage: firstMessage({ target: KAREN, difficulty: "cold", gatekeeper: null }), voiceId: KAREN.voice_id, repName: capitalise(repName), org };
}

const capitalise = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Scoring tries before a demo is left as failed. */
const MAX_ATTEMPTS = 3;

/**
 * Collect and score an ended demo call, then email the scorecard. Idempotent: only the ended -> scoring transition
 * does the work, each claim counts as an attempt, and the email is sent at most once.
 */
export async function finalizeDemo(id: string) {
  const db = createAdminClient();
  const { data: before } = await db.from("demo_calls").select("finalize_attempts").eq("id", id).maybeSingle();
  if (!before || before.finalize_attempts >= MAX_ATTEMPTS) return;
  const attempts = before.finalize_attempts + 1;
  const { data: demo } = await db
    .from("demo_calls")
    .update({ status: "scoring", scoring_started_at: new Date().toISOString(), finalize_attempts: attempts })
    .eq("id", id)
    .eq("status", "ended")
    .eq("finalize_attempts", before.finalize_attempts)
    .select("*")
    .maybeSingle();
  if (!demo) return;
  if (!demo.elevenlabs_conversation_id) {
    await db.from("demo_calls").update({ status: "failed", error: "The call never connected" }).eq("id", id);
    return;
  }
  // Hand the row back for another go, or give up on the last attempt.
  const retryOrFail = async (reason: string) => {
    await db.from("demo_calls").update({ status: attempts < MAX_ATTEMPTS ? "ended" : "failed", error: reason }).eq("id", id);
  };

  try {
    const convo = await fetchConversation(demo.elevenlabs_conversation_id);
    if (convo.status === "failed") throw new Error("The voice provider reported the conversation as failed");
    if (convo.status !== "done" && attempts < MAX_ATTEMPTS) {
      await retryOrFail("Waiting for the transcript");
      return;
    }
    if (demo.prompt_hash && (convo.overridePrompt === null || hashPrompt(convo.overridePrompt) !== demo.prompt_hash)) {
      await db.from("demo_calls").update({ status: "failed", error: "prompt mismatch" }).eq("id", id);
      return;
    }

    const turns: TranscriptTurn[] = convo.turns.map((t) => ({ role: t.role, text: t.text, t_start_ms: t.t_start_ms, interrupted: t.interrupted }));
    const durationSecs = Math.min(DEMO_MAX_SECONDS + 60, convo.durationSecs || Math.round((new Date(demo.ended_at ?? Date.now()).getTime() - new Date(demo.started_at ?? demo.created_at).getTime()) / 1000));
    if (!turns.some((t) => t.role === "rep")) {
      await db.from("demo_calls").update({ status: "scored", outcome: "incomplete", outcome_reason: "No speech was captured from you. Check the microphone is allowed for this site.", duration_seconds: durationSecs, transcript: turns }).eq("id", id);
      return;
    }

    const collected = String(convo.dataCollection.outcome ?? "");
    const prospectDecided = OUTCOMES.includes(collected as CallOutcome) ? (collected as CallOutcome) : null;
    const { repName, org } = demoPrompt(demo);
    const score = await scoreCall({
      turns,
      metrics: computeMetrics(convo.turns, durationSecs),
      difficulty: "cold",
      prospect: KAREN,
      company: org,
      repName,
      orgPlaybook: [],
      durationSecs,
      mood: MOODS.find((m) => m.id === "plain"),
      gatekeeper: false,
    });
    const outcome = prospectDecided ?? score.inferred_outcome;
    const outcomeReason = typeof convo.dataCollection.outcome_reason === "string" && convo.dataCollection.outcome_reason ? convo.dataCollection.outcome_reason : score.outcome_reason;

    await db
      .from("demo_calls")
      .update({
        status: "scored",
        outcome,
        outcome_reason: outcomeReason,
        duration_seconds: durationSecs,
        overall: score.overall,
        score: { dimensions: score.dimensions, strengths: score.strengths, improvements: score.improvements, coach_summary: score.coach_summary },
        transcript: turns,
        error: null,
      })
      .eq("id", id);
    await track("demo_scored", { outcome, overall: Math.round(score.overall * 10) / 10 }).catch(() => {});

    // Claim the email before sending so two workers can never both send it. A mail failure never un-scores the call.
    if (emailConfigured()) {
      const { data: claimedMail } = await db.from("demo_calls").update({ email_sent_at: new Date().toISOString() }).eq("id", id).is("email_sent_at", null).select("id").maybeSingle();
      if (claimedMail) {
        try {
          const mail = templates.demoScorecard({ firstName: repName, email: demo.email, overall: score.overall, outcome, outcomeReason, dimensions: score.dimensions, strengths: score.strengths, improvements: score.improvements, coachSummary: score.coach_summary, unsubscribeUrl: unsubscribeUrl(id) });
          await sendMail({ to: demo.email, ...mail });
        } catch (err) {
          reportError(err, { where: "demo_scorecard_email", extra: { demoId: id } });
          await db.from("demo_calls").update({ email_sent_at: null }).eq("id", id);
        }
      }
    }
  } catch (err) {
    reportError(err, { where: "demo_finalize", extra: { demoId: id, attempts } });
    await retryOrFail(err instanceof Error ? err.message : String(err));
  }
}

/** One-click opt-out from the follow-up, linked from both demo emails. */
export function unsubscribeUrl(id: string) {
  return absoluteUrl(`/api/demo/unsubscribe?id=${id}`);
}
