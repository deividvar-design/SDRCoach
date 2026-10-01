import * as Sentry from "@sentry/nextjs";
import { callContext, reportError } from "@/lib/sentry";
import { moodById } from "@/lib/domain/moods";
import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchConversation } from "@/lib/elevenlabs/client";
import { computeMetrics } from "@/lib/scoring/metrics";
import { scoreCall } from "@/lib/scoring/score";
import { loadOrgDigests } from "@/lib/knowledge/digest";
import type { CallOutcome, TranscriptTurn } from "@/types/database";
import { trialStatus } from "@/lib/billing/trial";
import { countTrialCalls } from "@/lib/billing/usage";
import { track } from "@vercel/analytics/server";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { recordAnthropicUsage, recordVoiceUsage } from "@/lib/usage/record";

const OUTCOMES: CallOutcome[] = ["meeting_booked", "callback", "info_sent", "rejected", "hung_up", "incomplete"];

/** Attempts before we stop waiting for the provider and use whatever transcript exists. */
const MAX_TRANSCRIPT_WAITS = 3;
/** Attempts before a call that keeps failing to score is left alone. */
const MAX_ATTEMPTS = 5;

export const hashPrompt = (prompt: string) => createHash("sha256").update(prompt).digest("hex");

type Db = ReturnType<typeof createAdminClient>;

/**
 * Turn an ended ElevenLabs conversation into a transcript, metrics and (on request) a coach score.
 *
 * Two phases. Collecting (transcript, stats, the prospect's decision) always happens and is written
 * before scoring starts, so a scorer failure never loses it. Scoring costs model tokens and only runs
 * once the rep asked for a review. Idempotent: only one caller wins the `-> scoring` transition.
 */
export async function finalizeCall(sessionId: string) {
  const db = createAdminClient();
  // The claim returns the row after the update, so read the status it is leaving first. It decides whether the
  // transcript was already collected and where a hand-back should return the row.
  const { data: before } = await db.from("call_sessions").select("status, finalize_attempts").eq("id", sessionId).maybeSingle();
  if (!before) return;
  if (before.finalize_attempts >= MAX_ATTEMPTS) return;

  const { data: claimed } = await db
    .from("call_sessions")
    .update({ status: "scoring", scoring_started_at: new Date().toISOString() })
    .eq("id", sessionId)
    .in("status", ["ended", "live", "failed", "collected"])
    .select("*, targets(name, title, company, pain_points, objections, kind), profiles(full_name), organizations(name, company_description, product_description, ideal_customer_profile)")
    .maybeSingle();
  if (!claimed) return;

  // Every claim counts as an attempt and pins ended_at, so a hand-back is never invisible to the sweep.
  const attempts = claimed.finalize_attempts + 1;
  const endedAt = claimed.ended_at ?? new Date().toISOString();
  await db.from("call_sessions").update({ finalize_attempts: attempts, ended_at: endedAt }).eq("id", sessionId);

  if (!claimed.elevenlabs_conversation_id) {
    await db.from("call_sessions").update({ status: "failed", error: "The call never connected" }).eq("id", sessionId);
    return;
  }

  const wantsScore = claimed.review_requested_at !== null;
  // A stored transcript means collection already happened, whatever the status said: never re-fetch or re-count it.
  const { data: stored } = await db.from("call_transcripts").select("turns").eq("session_id", sessionId).maybeSingle();
  const alreadyCollected = before.status === "collected" || Boolean(stored?.turns?.length);
  const restoreTo = alreadyCollected ? "collected" : "ended";

  try {
    // ---- Phase 1: collect. Reuse a stored transcript when a review is requested later.
    let turns: TranscriptTurn[] = [];
    let durationSecs = claimed.duration_seconds ?? 0;
    let collectedOutcome: string = claimed.outcome ?? "";
    let collectedReason: string | null = claimed.outcome_reason;
    let summary: string | null = claimed.prospect_summary;
    let metrics = claimed.metrics;

    if (stored?.turns?.length) {
      turns = stored.turns;
    } else {
      const convo = await fetchConversation(claimed.elevenlabs_conversation_id);
      if (convo.status === "failed") {
        await db.from("call_sessions").update({ status: "failed", error: "The voice provider reported the conversation as failed" }).eq("id", sessionId);
        return;
      }

      // Still processing on the provider's side: hand the session back so the report poller, the
      // post-call webhook or the sweep can try again once the transcript and analysis exist.
      if (convo.status !== "done" && attempts <= MAX_TRANSCRIPT_WAITS) {
        await db.from("call_sessions").update({ status: restoreTo, error: "Waiting for the transcript" }).eq("id", sessionId);
        return;
      }

      // The browser sent the prospect brief as an override. If it is missing or does not match what the server
      // issued, the call ran on some other prompt: keep the record, never score it, never let it on the leaderboard.
      if (claimed.prompt_hash && (convo.overridePrompt === null || hashPrompt(convo.overridePrompt) !== claimed.prompt_hash)) {
        await db
          .from("call_sessions")
          .update({ status: "collected", outcome: "incomplete", outcome_reason: "The prospect brief was altered on this call, so it was not scored.", error: "prompt mismatch", review_requested_at: null, ended_at: endedAt })
          .eq("id", sessionId);
        return;
      }

      turns = convo.turns.map((t) => ({ role: t.role, ...(t.speaker ? { speaker: t.speaker } : {}), text: t.text, t_start_ms: t.t_start_ms, interrupted: t.interrupted }));
      durationSecs = convo.durationSecs || Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(claimed.started_at ?? claimed.created_at).getTime()) / 1000));

      await db.from("call_transcripts").upsert({
        session_id: sessionId,
        turns,
        full_text: turns.map((t) => `${t.role === "rep" ? "Rep" : t.speaker === "gatekeeper" ? "Gatekeeper" : "Prospect"}: ${t.text}`).join("\n"),
      });

      metrics = computeMetrics(convo.turns, durationSecs);
      if (durationSecs > 0) await recordVoiceUsage(db, { orgId: claimed.org_id, sessionId, seconds: durationSecs });

      collectedOutcome = String(convo.dataCollection.outcome ?? "");
      collectedReason = typeof convo.dataCollection.outcome_reason === "string" && convo.dataCollection.outcome_reason ? convo.dataCollection.outcome_reason : null;
      summary = convo.summary;

      if (!alreadyCollected) await afterCollect(db, claimed.org_id);
    }

    const repSpoke = turns.some((t) => t.role === "rep");
    const prospectDecided = OUTCOMES.includes(collectedOutcome as CallOutcome) ? (collectedOutcome as CallOutcome) : null;

    if (!repSpoke) {
      const outcome_reason =
        turns.length === 0
          ? "No speech was captured on either side. Check that the microphone and speakers are allowed for this site."
          : "No speech was captured from the rep. Check that the microphone is allowed for this site and not muted.";
      await db
        .from("call_sessions")
        .update({ status: "collected", outcome: "incomplete", outcome_reason, duration_seconds: durationSecs, ended_at: endedAt, metrics, error: null, review_requested_at: null })
        .eq("id", sessionId);
      return;
    }

    // Persist everything collected now, while still holding the claim, so a scorer failure loses nothing.
    await db
      .from("call_sessions")
      .update({ outcome: prospectDecided, outcome_reason: collectedReason, prospect_summary: summary, duration_seconds: durationSecs, ended_at: endedAt, metrics, error: null })
      .eq("id", sessionId);

    // The rep may have asked for the review while we were collecting. Re-read before deciding.
    const { data: fresh } = await db.from("call_sessions").select("review_requested_at").eq("id", sessionId).maybeSingle();
    const scoreNow = wantsScore || fresh?.review_requested_at != null;

    if (!scoreNow) {
      await db.from("call_sessions").update({ status: "collected" }).eq("id", sessionId);
      return;
    }

    // ---- Phase 2: score.
    let score: Awaited<ReturnType<typeof scoreCall>>;
    try {
      const digests = await loadOrgDigests(claimed.org_id);
      score = await scoreCall({
        turns,
        metrics: metrics ?? computeMetrics(turns, durationSecs),
        difficulty: claimed.difficulty,
        prospect: claimed.targets ?? { name: "Prospect", title: "", company: "", pain_points: [], objections: [] },
        company: claimed.organizations ?? { name: "the rep's company", company_description: null, product_description: null, ideal_customer_profile: null },
        repName: claimed.profiles?.full_name ?? "Rep",
        orgPlaybook: digests,
        durationSecs,
        mood: moodById(claimed.mood),
        gatekeeper: claimed.gatekeeper,
      });
    } catch (err) {
      // Keep the collected call; the report offers a retry until the attempt budget runs out.
      const giveUp = attempts >= MAX_ATTEMPTS;
      Sentry.captureException(err, callContext(sessionId, { where: "score", attempts, giveUp }));
      await db
        .from("call_sessions")
        .update({ status: "collected", error: `Scoring failed: ${err instanceof Error ? err.message : String(err)}`, ...(giveUp ? { review_requested_at: null } : {}) })
        .eq("id", sessionId);
      return;
    }

    await recordAnthropicUsage(db, { orgId: claimed.org_id, sessionId, kind: "score", model: score.model, usage: score.usage });

    // The prospect decides. ElevenLabs' post-call data collection is the primary signal; the grader is the fallback.
    const outcome: CallOutcome = prospectDecided ?? score.inferred_outcome;
    const outcomeReason = collectedReason ?? score.outcome_reason;

    await db.from("call_scores").upsert({
      session_id: sessionId,
      overall: score.overall,
      dimensions: score.dimensions,
      strengths: score.strengths,
      improvements: score.improvements,
      coach_summary: score.coach_summary,
      moments: score.moments,
      objections: score.objections,
      model: score.model,
    });

    await db.from("call_sessions").update({ status: "scored", outcome, outcome_reason: outcomeReason, error: null }).eq("id", sessionId);
  } catch (err) {
    await db
      .from("call_sessions")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
      .eq("id", sessionId);
    throw err;
  }
}

/** Funnel milestones and trial emails: after this call, where does the workspace stand? Runs once per call, when it is first collected. */
async function afterCollect(db: Db, orgId: string) {
  const { data: orgRow } = await db.from("organizations").select("plan, trial_call_limit, trial_ends_at").eq("id", orgId).single();
  const connected = await countTrialCalls(db, orgId);
  if (connected === 1) await track("first_call", { plan: orgRow?.plan ?? "" }).catch(() => {});
  if (connected === 5) await track("fifth_call", { plan: orgRow?.plan ?? "" }).catch(() => {});
  if (orgRow?.plan !== "trial") return;
  const t = trialStatus(orgRow, connected);
  if (t.callsLeft <= 2 && t.callsLeft > 0) await sendLifecycle(orgId, "two_calls_left").catch((err) => reportError(err, { where: "trial_email", orgId }));
  if (t.callsLeft === 0) await sendLifecycle(orgId, "trial_ended", { reason: "calls" }).catch((err) => reportError(err, { where: "trial_email", orgId }));
}
