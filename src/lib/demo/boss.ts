import "server-only";
import { logFunnel } from "@/lib/funnel";
import { captureServer } from "@/lib/analytics/server";
import { authMethod } from "@/lib/demo/source";
import { getObjectionPage } from "@/lib/objections";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { KAREN_BRIEF, KAREN_BRIEF_TEXT } from "@/content/karen-brief";
import { buildPersonaPrompt, firstMessage } from "@/lib/prompts/persona";
import { MOODS } from "@/lib/domain/moods";
import { fetchConversation } from "@/lib/elevenlabs/client";
import { computeMetrics } from "@/lib/scoring/metrics";
import { scoreCall } from "@/lib/scoring/score";
import { hashPrompt } from "@/lib/calls/finalize";
import { recordAnthropicUsage, recordVoiceUsage } from "@/lib/usage/record";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { reportError } from "@/lib/sentry";
import { track } from "@vercel/analytics/server";
import type { CallOutcome, DemoCall, TranscriptTurn } from "@/types/database";
import { absoluteUrl } from "@/lib/site";
import { newShareSlug } from "./share";

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

/**
 * Limits count calls that actually minted a voice token (prompt_hash set). Waitlisted rows, abandoned forms and
 * mic-denied attempts never count, so a failed first try is not a lifetime ban.
 */
export async function checkDemoLimits(db: Db, { email, domain, ip, personal = false, perEmail = DEMO_LIMITS.perEmail }: { email?: string | null; domain?: string | null; ip: string | null; personal?: boolean; perEmail?: number }): Promise<string | null> {
  const since = new Date(Date.now() - DAY).toISOString();
  const count = async (q: ReturnType<Db["from"]>) => (await q).count ?? 0;
  const minted = () => db.from("demo_calls").select("id", { count: "exact", head: true }).not("prompt_hash", "is", null);
  const [byEmail, byDomain, byIp, global] = await Promise.all([
    email ? count(minted().eq("email", email)) : Promise.resolve(0),
    domain ? count(minted().eq("domain", domain).gte("created_at", since)) : Promise.resolve(0),
    ip ? count(minted().eq("ip", ip).gte("created_at", since)) : Promise.resolve(0),
    count(minted().gte("created_at", since)),
  ]);
  if (byEmail >= perEmail) return "already_played";
  if (!personal && byDomain >= DEMO_LIMITS.perDomainPerDay) return "domain_limit";
  if (byIp >= DEMO_LIMITS.perIpPerDay) return "ip_limit";
  if (global >= DEMO_LIMITS.globalPerDay) return "busy";
  return null;
}

/** Karen's brief. Every caller sells the same made-up product, shown to them on the page and on the call screen. */
export function demoPrompt(demo: Pick<DemoCall, "email">) {
  const org = {
    name: KAREN_BRIEF.company,
    company_description: KAREN_BRIEF.oneLine,
    product_description: KAREN_BRIEF_TEXT,
    ideal_customer_profile: "Procurement teams at mid-size and large companies with many suppliers.",
  };
  const repName = demo.email?.split("@")[0]?.split(/[._-]/)[0] || "the rep";
  const mood = MOODS.find((m) => m.id === "plain")!;
  const prompt = buildPersonaPrompt({ target: KAREN, difficulty: "cold", org, repName: capitalise(repName), mood, gatekeeper: null, ttsModel: process.env.ELEVENLABS_TTS_MODEL }) + KAREN_SIGN_OFF;
  return { prompt, firstMessage: firstMessage({ target: KAREN, difficulty: "cold", gatekeeper: null }), voiceId: KAREN.voice_id, repName: capitalise(repName), org };
}

/**
 * Public demo only: Karen's parting line nods at practising, once, as she hangs up. Paid practice calls never get
 * this. The caller had a five-line brief and a minute to read it, so the line is about how they handled her, never
 * about their product. No line offers a callback, because the outcome is read from the transcript.
 */
export const KAREN_SIGN_OFF = `

## Your parting line
The caller was handed a five-line brief about this product a minute before dialling. They are not expected to know it deeply, so never mock their product knowledge or tell them to learn their product; judge only how they handled you.

Your very last line, once you have made your decision clear and immediately before you use the end_call tool, is one dry parting remark that nods at practising. Say it exactly once, in your own flat voice, as a throwaway on your way out. Never earlier in the call, never as a pitch, never explained. Pick the one that fits how the call went, or say something close to it:
- They lost you: "Practise on someone who isn't me. I hear there's a free trial for that." or "Go get some reps in first. Apparently the first ten are free." or "You're not ready for me yet. Practising is free, I checked."
- They nearly had you: "Not bad. A few more rounds and you'd have had me. I'm told those are free."
- They earned the meeting: "Fine. Now go teach your team to do that." or "You got me. There are harder people than me, so keep practising."

Never name a company, website, product, plan or price in this line, and never invite them to call you back. If the rep asks what you mean, you have already hung up.`;

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
    if (durationSecs > 0) await recordVoiceUsage(db, { demoId: id, seconds: durationSecs });
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
    await recordAnthropicUsage(db, { demoId: id, kind: "score", model: score.model, usage: score.usage });
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
        share_slug: demo.share_slug ?? newShareSlug(),
      })
      .eq("id", id);
    await track("demo_scored", { outcome, overall: Math.round(score.overall * 10) / 10 }).catch(() => {});
    const first = await logFunnel("karen_call_completed", { email: demo.email, subject: id, dedupeKey: `karen_completed:${id}`, meta: { outcome, overall: Math.round(score.overall * 10) / 10, personal: demo.personal_email } });
    // The caller may have closed the tab a minute ago; the report is reported from here, to their analytics id.
    if (first && demo.analytics_id) {
      await captureServer(
        demo.analytics_id,
        "karen_call_completed",
        { source_path: demo.source_path, objection: demo.objection, auth_method: authMethod(demo.method), duration_seconds: durationSecs, score: Math.round(score.overall * 10) / 10, outcome, demo_id: id },
        { sessionId: demo.analytics_session },
      );
    }

    // The scorecard goes out now when the caller already gave an address; otherwise the email step sends it.
    if (demo.email) await sendDemoScorecard(id);
  } catch (err) {
    reportError(err, { where: "demo_finalize", extra: { demoId: id, attempts } });
    await retryOrFail(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Email the scorecard for a scored call, at most once. Claims email_sent_at before sending so two workers can never
 * both send it; a mail failure releases the claim and never un-scores the call.
 */
export async function sendDemoScorecard(id: string) {
  if (!emailConfigured()) return;
  const db = createAdminClient();
  const { data: demo } = await db.from("demo_calls").select("*").eq("id", id).maybeSingle();
  if (!demo || !demo.email || demo.status !== "scored" || !demo.score || demo.email_sent_at) return;
  const { data: claimed } = await db.from("demo_calls").update({ email_sent_at: new Date().toISOString() }).eq("id", id).is("email_sent_at", null).select("id").maybeSingle();
  if (!claimed) return;
  try {
    const { repName } = demoPrompt(demo);
    const cameFrom = demo.objection ? getObjectionPage(demo.objection) : null;
    const mail = templates.demoScorecard({
      firstName: repName,
      email: demo.email,
      overall: Number(demo.overall ?? 0),
      outcome: demo.outcome ?? "rejected",
      outcomeReason: demo.outcome_reason ?? "",
      dimensions: demo.score.dimensions,
      strengths: demo.score.strengths,
      improvements: demo.score.improvements,
      coachSummary: demo.score.coach_summary,
      unsubscribeUrl: unsubscribeUrl(id),
      shareUrl: demo.share_slug ? absoluteUrl(`/karen/score/${demo.share_slug}`) : null,
      personalEmail: demo.personal_email,
      cameFrom: cameFrom ? { text: cameFrom.phrasings[0] ?? cameFrom.label, url: absoluteUrl(`/objections/${cameFrom.slug}`) } : null,
    });
    await sendMail({ to: demo.email, ...mail });
  } catch (err) {
    reportError(err, { where: "demo_scorecard_email", extra: { demoId: id } });
    await db.from("demo_calls").update({ email_sent_at: null }).eq("id", id);
  }
}

/** One-click opt-out from the follow-up, linked from both demo emails. */
export function unsubscribeUrl(id: string) {
  return absoluteUrl(`/api/demo/unsubscribe?id=${id}`);
}
