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

export async function checkDemoLimits(db: Db, { email, domain, ip }: { email: string; domain: string; ip: string | null }): Promise<string | null> {
  const since = new Date(Date.now() - DAY).toISOString();
  const count = async (q: ReturnType<Db["from"]>) => (await q).count ?? 0;
  const [byEmail, byDomain, byIp, global] = await Promise.all([
    count(db.from("demo_calls").select("id", { count: "exact", head: true }).ilike("email", email)),
    count(db.from("demo_calls").select("id", { count: "exact", head: true }).eq("domain", domain).gte("created_at", since)),
    ip ? count(db.from("demo_calls").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since)) : Promise.resolve(0),
    count(db.from("demo_calls").select("id", { count: "exact", head: true }).gte("created_at", since)),
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

/**
 * Collect and score an ended demo call, then email the scorecard. Idempotent: only the ended -> scoring transition
 * does the work; a second caller finds nothing to claim.
 */
export async function finalizeDemo(id: string) {
  const db = createAdminClient();
  const { data: demo } = await db.from("demo_calls").update({ status: "scoring" }).eq("id", id).in("status", ["ended", "live"]).select("*").maybeSingle();
  if (!demo) return;
  if (!demo.elevenlabs_conversation_id) {
    await db.from("demo_calls").update({ status: "failed", error: "The call never connected" }).eq("id", id);
    return;
  }

  try {
    const convo = await fetchConversation(demo.elevenlabs_conversation_id);
    if (convo.status === "failed") throw new Error("The voice provider reported the conversation as failed");
    if (demo.prompt_hash && (convo.overridePrompt === null || hashPrompt(convo.overridePrompt) !== demo.prompt_hash)) throw new Error("prompt mismatch");

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

    // The score is saved either way; a mail failure (unverified domain, provider outage) must not mark the call failed.
    if (emailConfigured()) {
      try {
        const mail = templates.demoScorecard({ firstName: repName, email: demo.email, overall: score.overall, outcome, outcomeReason, dimensions: score.dimensions, strengths: score.strengths, improvements: score.improvements, coachSummary: score.coach_summary });
        await sendMail({ to: demo.email, ...mail });
        await db.from("demo_calls").update({ email_sent_at: new Date().toISOString() }).eq("id", id);
      } catch (err) {
        reportError(err, { where: "demo_scorecard_email", extra: { demoId: id } });
      }
    }
  } catch (err) {
    reportError(err, { where: "demo_finalize", extra: { demoId: id } });
    await db.from("demo_calls").update({ status: "failed", error: err instanceof Error ? err.message : String(err) }).eq("id", id);
  }
}
