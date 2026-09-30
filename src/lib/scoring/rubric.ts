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

/**
 * Objection taxonomy. The grader tags every objection the prospect raises with one of these so
 * managers can see what the team hears most and how it is handled. Stable keys, human labels, and
 * the coaching move that usually works.
 */
export const OBJECTIONS = {
  no_time: { label: "No time right now", coaching: "Ask for thirty seconds, not fifteen minutes. Earn the extension with a reason for the call that fits their role." },
  not_interested: { label: "Not interested", coaching: "Do not defend. Ask one question about the problem behind the product, then decide whether to continue." },
  send_email: { label: "Send me an email", coaching: "Agree, then ask what would make it worth reading. That question restarts discovery." },
  already_have_solution: { label: "Already have a solution", coaching: "Ask what they use it for and what it does not cover. Never argue with the incumbent." },
  no_budget: { label: "No budget", coaching: "Budget is a timing signal. Ask when it is set and what the current cost of the problem is." },
  not_decision_maker: { label: "Not the right person", coaching: "Ask who owns the problem and what they would need to see. A referral is a win." },
  bad_timing: { label: "Bad timing / call later", coaching: "Pin a date and time before hanging up. A vague 'later' is a no." },
  happy_as_is: { label: "Happy with how things are", coaching: "Ask what they would change if they could. Contentment usually has an exception." },
  price: { label: "Too expensive", coaching: "Price came before value. Go back to the cost of the problem and a peer result." },
  skeptical: { label: "Doubts it works", coaching: "Offer one specific proof point for a company like theirs, then ask what would convince them." },
  how_did_you_get_my_number: { label: "How did you get my number", coaching: "Answer plainly, then return to the reason for the call. Do not apologise twice." },
  not_a_fit: { label: "We're not a fit", coaching: "Do not argue the fit. Ask one question about how they handle the problem today; if the answer confirms no fit, thank them and end it well." },
  switching_cost: { label: "Too hard to switch", coaching: "Agree that switching is work. Ask what the current setup costs them each month, then size the change against that, not against zero." },
  wrong_person: { label: "Why are you calling me", coaching: "Explain in one sentence why their role, then ask who owns the outcome. A name and a reason to call them is a win." },
  wont_share: { label: "Won't share details", coaching: "Never push for numbers on a first call. Offer a range from a peer and ask whether they are above or below it." },
  other: { label: "Other", coaching: "Acknowledge, isolate the real concern, reframe, redirect to a question." },
} as const;

export type ObjectionKind = keyof typeof OBJECTIONS;
export const OBJECTION_KEYS = Object.keys(OBJECTIONS) as ObjectionKind[];
