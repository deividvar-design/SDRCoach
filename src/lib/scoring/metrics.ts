import type { CallMetrics, TranscriptTurn } from "@/types/database";

const FILLERS = /\b(um+|uh+|erm|you know|basically|literally|sort of|kind of|actually)\b|\blike,/gi;
const OBJECTION_HINTS = /\b(not interested|no budget|already (have|use|work)|send (me )?(an |some )?(email|info|something)|bad time|in the middle of|call (me )?back|not the (right )?person|who is this|how did you get|remove me|no thanks|we'?re (good|fine|happy|all set)|too expensive|not (this|a) (quarter|priority))\b/i;

interface TimedTurn extends TranscriptTurn {
  t_start_ms: number;
  interrupted?: boolean;
}

/** Deterministic call statistics. Cheap, explainable, and shown next to the model's judgement. */
export function computeMetrics(rawTurns: TranscriptTurn[], durationSecs: number): CallMetrics {
  const turns = rawTurns.filter((t): t is TimedTurn => typeof t.t_start_ms === "number");
  const endMs = Math.max(durationSecs * 1000, turns.at(-1)?.t_start_ms ?? 0);

  let repMs = 0;
  let prospectMs = 0;
  let longestRep = 0;
  let repQuestions = 0;
  let fillers = 0;
  let firstObjection: number | null = null;
  let interruptionsByRep = 0;

  turns.forEach((t, i) => {
    const next = turns[i + 1]?.t_start_ms ?? endMs;
    // Estimate speaking time from words when the gap to the next turn is generous.
    const words = t.text.split(/\s+/).filter(Boolean).length;
    const byWords = words * 400 + 800;
    const gap = next - t.t_start_ms;
    // The last turn has no successor (or the call clock stopped early): fall back to the word estimate.
    const spoken = gap > 0 ? Math.min(gap, byWords) : byWords;
    if (t.role === "rep") {
      repMs += spoken;
      longestRep = Math.max(longestRep, spoken);
      repQuestions += (t.text.match(/\?/g) ?? []).length;
      fillers += (t.text.match(FILLERS) ?? []).length;
    } else {
      prospectMs += spoken;
      if (t.interrupted) interruptionsByRep += 1;
      if (firstObjection == null && OBJECTION_HINTS.test(t.text)) firstObjection = Math.round(t.t_start_ms / 1000);
    }
  });

  const total = repMs + prospectMs;
  return {
    rep_talk_ratio: total ? Math.round((repMs / total) * 100) / 100 : 0,
    longest_rep_monologue_secs: Math.round(longestRep / 1000),
    rep_questions: repQuestions,
    filler_words: fillers,
    first_objection_secs: firstObjection,
    rep_turns: turns.filter((t) => t.role === "rep").length,
    prospect_turns: turns.filter((t) => t.role === "prospect").length,
    interruptions_by_rep: interruptionsByRep,
  };
}
