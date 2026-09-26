import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchConversation } from "@/lib/elevenlabs/client";
import { computeMetrics } from "@/lib/scoring/metrics";
import { scoreCall } from "@/lib/scoring/score";
import { loadOrgDigests } from "@/lib/knowledge/digest";
import type { CallOutcome, TranscriptTurn } from "@/types/database";

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
    const turns: TranscriptTurn[] = convo.turns.map((t) => ({ role: t.role, text: t.text, t_start_ms: t.t_start_ms }));
    const durationSecs = convo.durationSecs || Math.round((Date.now() - new Date(claimed.started_at ?? claimed.created_at).getTime()) / 1000);

    await db.from("call_transcripts").upsert({
      session_id: sessionId,
      turns,
      full_text: turns.map((t) => `${t.role === "rep" ? "Rep" : "Prospect"}: ${t.text}`).join("\n"),
    });

    const metrics = computeMetrics(convo.turns, durationSecs);

    if (turns.filter((t) => t.role === "rep").length === 0) {
      await db
        .from("call_sessions")
        .update({ status: "scored", outcome: "incomplete", outcome_reason: "The rep did not say anything.", duration_seconds: durationSecs, ended_at: new Date().toISOString(), metrics })
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
