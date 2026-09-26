/**
 * The scoring rubric. Stable across reps and time so scores stay comparable.
 * Anchored in published cold-call research (Gong's analysis of 300M+ calls) and standard SDR coaching frameworks.
 */
export const RUBRIC = {
  opener: {
    label: "Opener",
    description:
      "First 15 seconds. Confident, clear, states name and company, uses a proven opener (e.g. a permission-based or pattern-interrupt line) rather than 'did I catch you at a bad time?' or 'how are you today?'. Sets a calm, unhurried tone.",
  },
  reason_for_call: {
    label: "Reason for call",
    description:
      "States the reason for calling explicitly and early ('the reason for my call is…'), makes it specific to this prospect's role, company or trigger event rather than a generic pitch, and earns the right to continue.",
  },
  discovery: {
    label: "Discovery",
    description:
      "Asks problem-focused, open questions tied to the prospect's world; listens and follows up on what the prospect actually said; avoids interrogation and avoids turning a cold call into a full discovery meeting.",
  },
  objection_handling: {
    label: "Objection handling",
    description:
      "Acknowledges each objection before responding, stays composed, isolates the real concern, reframes with relevance, and redirects to a question or next step instead of arguing or caving.",
  },
  value_prop: {
    label: "Value proposition",
    description:
      "Connects what the company does to a problem the prospect revealed; outcome-led, concrete, brief; no feature dumps; uses proof (a peer, a number) where natural.",
  },
  close: {
    label: "Close",
    description:
      "Asks for a specific, small next step (a 15–30 minute call) with a proposed day and time, handles a soft no, confirms the details, and ends cleanly.",
  },
} as const;

export type RubricKey = keyof typeof RUBRIC;
export const RUBRIC_KEYS = Object.keys(RUBRIC) as RubricKey[];

/** Weighted overall so the close and reason for call matter most, matching what actually books meetings. */
export const RUBRIC_WEIGHTS: Record<RubricKey, number> = {
  opener: 0.15,
  reason_for_call: 0.2,
  discovery: 0.15,
  objection_handling: 0.2,
  value_prop: 0.1,
  close: 0.2,
};

/** Recommend the next level after three calls averaging this or higher at the current level. */
export const LEVEL_UP_THRESHOLD = 7;

export function weightedOverall(d: Record<RubricKey, { score: number }>) {
  const total = RUBRIC_KEYS.reduce((acc, k) => acc + d[k].score * RUBRIC_WEIGHTS[k], 0);
  return Math.round(total * 10) / 10;
}
export const LEVEL_UP_MIN_CALLS = 3;
