import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchConversation } from "@/lib/elevenlabs/client";
import { computeMetrics } from "@/lib/scoring/metrics";
import { scoreCall } from "@/lib/scoring/score";
import { loadOrgDigests } from "@/lib/knowledge/digest";
import type { CallOutcome, TranscriptTurn } from "@/types/database";
import { trialStatus } from "@/lib/billing/trial";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { recordAnthropicUsage, recordVoiceUsage } from "@/lib/usage/record";

const OUTCOMES: CallOutcome[] = ["meeting_booked", "callback", "info_sent", "rejected", "hung_up", "incomplete"];

/**
 * Turn an ended ElevenLabs conversation into a transcript, metrics and (on request) a coach score.
 *
 * Two phases. Collecting (transcript, stats, the prospect's decision) always happens. Scoring costs
 * model tokens and only runs once the rep asked for a review, so a call the rep already knows went
 * badly never gets scored. Idempotent: only one caller wins the `-> scoring` transition.
 */
export async function finalizeCall(sessionId: string) {
  const db = createAdminClient();

  const { data: claimed } = await db
    .from("call_sessions")
    .update({ status: "scoring" })
    .eq("id", sessionId)
    .in("status", ["ended", "live", "failed", "collected"])
    .select("*, targets(name, title, company, pain_points, objections), profiles(full_name), organizations(name, company_description, product_description, ideal_customer_profile)")
    .maybeSingle();
  if (!claimed) return;
  if (!claimed.elevenlabs_conversation_id) {
    await db.from("call_sessions").update({ status: "failed", error: "no conversation id" }).eq("id", sessionId);
    return;
  }

  const wantsScore = claimed.review_requested_at !== null;
  const restoreTo = claimed.status === "collected" ? "collected" : "ended";

  try {
    // ---- Phase 1: collect. Reuse a stored transcript when a review is requested later.
    let turns: TranscriptTurn[] = [];
    let durationSecs = claimed.duration_seconds ?? 0;
    let collectedOutcome: string = claimed.outcome ?? "";
    let collectedReason: string | null = claimed.outcome_reason;
    let summary: string | null = claimed.prospect_summary;
    let metrics = claimed.metrics;

    const { data: stored } = claimed.status === "collected" ? await db.from("call_transcripts").select("turns").eq("session_id", sessionId).maybeSingle() : { data: null };

    if (stored?.turns?.length) {
      turns = stored.turns;
    } else {
      const convo = await fetchConversation(claimed.elevenlabs_conversation_id);
      if (convo.status === "failed") {
        await db.from("call_sessions").update({ status: "failed", error: "The voice provider reported the conversation as failed" }).eq("id", sessionId);
        return;
      }
      turns = convo.turns.map((t) => ({ role: t.role, text: t.text, t_start_ms: t.t_start_ms }));

      // Still processing on the provider's side and nothing to show yet: hand the session back so the
      // report poller, the post-call webhook or the sweep can try again once the transcript exists.
      if (turns.length === 0 && convo.status !== "done") {
        await db.from("call_sessions").update({ status: restoreTo, error: "Waiting for the transcript" }).eq("id", sessionId);
        return;
      }

      const endedAt = claimed.ended_at ? new Date(claimed.ended_at).getTime() : Date.now();
      durationSecs = convo.durationSecs || Math.max(0, Math.round((endedAt - new Date(claimed.started_at ?? claimed.created_at).getTime()) / 1000));

      await db.from("call_transcripts").upsert({
        session_id: sessionId,
        turns,
        full_text: turns.map((t) => `${t.role === "rep" ? "Rep" : "Prospect"}: ${t.text}`).join("\n"),
      });

      metrics = computeMetrics(convo.turns, durationSecs);
      if (durationSecs > 0 && claimed.status !== "collected") await recordVoiceUsage(db, { orgId: claimed.org_id, sessionId, seconds: durationSecs });

      collectedOutcome = String(convo.dataCollection.outcome ?? "");
      collectedReason = typeof convo.dataCollection.outcome_reason === "string" && convo.dataCollection.outcome_reason ? convo.dataCollection.outcome_reason : null;
      summary = convo.summary;

      await afterCollect(db, claimed.org_id);
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
        .update({ status: "collected", outcome: "incomplete", outcome_reason, duration_seconds: durationSecs, ended_at: claimed.ended_at ?? new Date().toISOString(), metrics, error: null })
        .eq("id", sessionId);
      return;
    }

    // The rep may have asked for the review while we were collecting. Re-read before deciding.
    const { data: fresh } = await db.from("call_sessions").select("review_requested_at").eq("id", sessionId).maybeSingle();
    const scoreNow = wantsScore || fresh?.review_requested_at != null;

    if (!scoreNow) {
      await db
        .from("call_sessions")
        .update({
          status: "collected",
          outcome: prospectDecided,
          outcome_reason: collectedReason,
          prospect_summary: summary,
          duration_seconds: durationSecs,
          ended_at: claimed.ended_at ?? new Date().toISOString(),
          metrics,
          error: null,
        })
        .eq("id", sessionId);
      return;
    }

    // ---- Phase 2: score.
    const digests = await loadOrgDigests(claimed.org_id);
    const score = await scoreCall({
      turns,
      metrics: metrics ?? computeMetrics(turns, durationSecs),
      difficulty: claimed.difficulty,
      prospect: claimed.targets ?? { name: "Prospect", title: "", company: "", pain_points: [], objections: [] },
      company: claimed.organizations ?? { name: "the rep's company", company_description: null, product_description: null, ideal_customer_profile: null },
      repName: claimed.profiles?.full_name ?? "Rep",
      orgPlaybook: digests,
      durationSecs,
    });

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

    await db
      .from("call_sessions")
      .update({
        status: "scored",
        outcome,
        outcome_reason: outcomeReason,
        prospect_summary: summary,
        duration_seconds: durationSecs,
        ended_at: claimed.ended_at ?? new Date().toISOString(),
        metrics,
        error: null,
      })
      .eq("id", sessionId);

    if (claimed.assignment_id && outcome !== "incomplete") {
      const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("assignment_id", claimed.assignment_id).in("status", ["scored", "collected"]).neq("outcome", "incomplete");
      const { data: assignment } = await db.from("assignments").select("required_calls").eq("id", claimed.assignment_id).single();
      if (assignment && (count ?? 0) >= assignment.required_calls) {
        await db.from("assignments").update({ completed_at: new Date().toISOString() }).eq("id", claimed.assignment_id).is("completed_at", null);
      }
    }
  } catch (err) {
    await db
      .from("call_sessions")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
      .eq("id", sessionId);
    throw err;
  }
}

/** Trial emails: after this call, how many are left? Runs once per call, when it is first collected. */
async function afterCollect(db: ReturnType<typeof createAdminClient>, orgId: string) {
  const { data: orgRow } = await db.from("organizations").select("plan, trial_call_limit, trial_ends_at").eq("id", orgId).single();
  if (orgRow?.plan !== "trial") return;
  const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", orgId).not("started_at", "is", null);
  const t = trialStatus(orgRow, count ?? 0);
  if (t.callsLeft <= 2 && t.callsLeft > 0) await sendLifecycle(orgId, "two_calls_left").catch(() => {});
  if (t.callsLeft === 0) await sendLifecycle(orgId, "trial_ended", { reason: "calls" }).catch(() => {});
}
