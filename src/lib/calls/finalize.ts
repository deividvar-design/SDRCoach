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
 * Turn an ended ElevenLabs conversation into a transcript, metrics and a coach score.
 * Idempotent: only one caller wins the `ended -> scoring` transition; everyone else no-ops.
 */
export async function finalizeCall(sessionId: string) {
  const db = createAdminClient();

  const { data: claimed } = await db
    .from("call_sessions")
    .update({ status: "scoring" })
    .eq("id", sessionId)
    .in("status", ["ended", "live", "failed"])
    .select("*, targets(name, title, company), profiles(full_name), organizations(id)")
    .maybeSingle();
  if (!claimed) return;
  if (!claimed.elevenlabs_conversation_id) {
    await db.from("call_sessions").update({ status: "failed", error: "no conversation id" }).eq("id", sessionId);
    return;
  }

  try {
    const convo = await fetchConversation(claimed.elevenlabs_conversation_id);
    if (convo.status === "failed") {
      await db.from("call_sessions").update({ status: "failed", error: "The voice provider reported the conversation as failed" }).eq("id", sessionId);
      return;
    }
    const turns: TranscriptTurn[] = convo.turns.map((t) => ({ role: t.role, text: t.text, t_start_ms: t.t_start_ms }));

    // Still processing on the provider's side and nothing to show yet: hand the session back so the
    // report poller, the post-call webhook or the sweep can finalize it once the transcript exists.
    if (turns.length === 0 && convo.status !== "done") {
      await db.from("call_sessions").update({ status: "ended", error: "Waiting for the transcript" }).eq("id", sessionId);
      return;
    }
    const endedAt = claimed.ended_at ? new Date(claimed.ended_at).getTime() : Date.now();
    const durationSecs = convo.durationSecs || Math.max(0, Math.round((endedAt - new Date(claimed.started_at ?? claimed.created_at).getTime()) / 1000));

    await db.from("call_transcripts").upsert({
      session_id: sessionId,
      turns,
      full_text: turns.map((t) => `${t.role === "rep" ? "Rep" : "Prospect"}: ${t.text}`).join("\n"),
    });

    const metrics = computeMetrics(convo.turns, durationSecs);
    if (durationSecs > 0) await recordVoiceUsage(db, { orgId: claimed.org_id, sessionId, seconds: durationSecs });

    if (turns.filter((t) => t.role === "rep").length === 0) {
      const outcome_reason =
        turns.length === 0
          ? "No speech was captured on either side. Check that the microphone and speakers are allowed for this site."
          : "No speech was captured from the rep. Check that the microphone is allowed for this site and not muted.";
      await db
        .from("call_sessions")
        .update({ status: "scored", outcome: "incomplete", outcome_reason, duration_seconds: durationSecs, ended_at: new Date().toISOString(), metrics, error: null })
        .eq("id", sessionId);
      return;
    }

    const digests = await loadOrgDigests(claimed.org_id);
    const score = await scoreCall({
      turns,
      metrics,
      difficulty: claimed.difficulty,
      prospect: claimed.targets ?? { name: "Prospect", title: "", company: "" },
      repName: claimed.profiles?.full_name ?? "Rep",
      orgPlaybook: digests,
      durationSecs,
    });

    await recordAnthropicUsage(db, { orgId: claimed.org_id, sessionId, kind: "score", model: score.model, usage: score.usage });

    // The prospect decides. ElevenLabs' post-call data collection is the primary signal; the grader is the fallback.
    const collected = String(convo.dataCollection.outcome ?? "");
    const outcome: CallOutcome = OUTCOMES.includes(collected as CallOutcome) ? (collected as CallOutcome) : score.inferred_outcome;
    const outcomeReason = typeof convo.dataCollection.outcome_reason === "string" && convo.dataCollection.outcome_reason ? convo.dataCollection.outcome_reason : score.outcome_reason;

    await db.from("call_scores").upsert({
      session_id: sessionId,
      overall: score.overall,
      dimensions: score.dimensions,
      strengths: score.strengths,
      improvements: score.improvements,
      coach_summary: score.coach_summary,
      moments: score.moments,
      model: score.model,
    });

    await db
      .from("call_sessions")
      .update({
        status: "scored",
        outcome,
        outcome_reason: outcomeReason,
        prospect_summary: convo.summary,
        duration_seconds: durationSecs,
        ended_at: new Date().toISOString(),
        metrics,
        error: null,
      })
      .eq("id", sessionId);

    // Trial emails: after this call, how many are left?
    const { data: orgRow } = await db.from("organizations").select("plan, trial_call_limit, trial_ends_at").eq("id", claimed.org_id).single();
    if (orgRow?.plan === "trial") {
      const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", claimed.org_id).not("started_at", "is", null);
      const t = trialStatus(orgRow, count ?? 0);
      if (t.callsLeft <= 2 && t.callsLeft > 0) await sendLifecycle(claimed.org_id, "two_calls_left").catch(() => {});
      if (t.callsLeft === 0) await sendLifecycle(claimed.org_id, "trial_ended", { reason: "calls" }).catch(() => {});
    }

    if (claimed.assignment_id && outcome !== "incomplete") {
      const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("assignment_id", claimed.assignment_id).eq("status", "scored");
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
