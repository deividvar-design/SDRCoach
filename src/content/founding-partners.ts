/**
 * The founding-partner program in one place: what the page promises, what approval issues, and what the cron
 * enforces. Change a number here and every surface follows.
 */
export const PARTNER = {
  spots: 10,
  pilotDays: 30,
  callsPerRep: 40,
  maxReps: 5,
  minReps: 3,
  priceLockMonths: 12,
  /** The ask: start within a week, then three calls per rep per week for four weeks. */
  startWithinDays: 7,
  callsPerRepPerWeek: 3,
  weeks: 4,
  /** No call by this day after the link was claimed and the spot goes back to the queue. */
  releaseAfterDays: 14,
} as const;

/** Calls a pilot gets: forty per rep, for up to five reps. */
export function pilotCalls(sdrCount: number) {
  return Math.min(Math.max(sdrCount, 1), PARTNER.maxReps) * PARTNER.callsPerRep;
}

/** Seats a pilot workspace needs: the reps in the pilot plus the manager running it. */
export function pilotSeats(sdrCount: number) {
  return Math.min(Math.max(sdrCount, 1), PARTNER.maxReps) + 1;
}

export const PARTNER_GETS = [
  `${PARTNER.pilotDays} days of concierge onboarding. Send us your website and we build the workspace: what you sell, who you sell to, and a first prospect from your own target accounts. Your reps open a link and dial.`,
  `${PARTNER.callsPerRep} scored calls per rep for up to ${PARTNER.maxReps} reps during the pilot.`,
  `The founding price, locked for ${PARTNER.priceLockMonths} months if you stay on after the pilot.`,
  "Your feature requests go to the front of the queue.",
  "A report at day 30 showing how your team's scores moved, built from your own calls.",
];

export const PARTNER_ASKS = [
  `Start within ${PARTNER.startWithinDays} days of approval.`,
  `Each rep makes ${PARTNER.callsPerRepPerWeek} practice calls a week for ${PARTNER.weeks} weeks.`,
  "A short written check-in at day 30. Five questions, no meeting.",
  "Permission to publish your company name, logo, a quote from you, and the day-30 score numbers. You see and approve all of it first.",
];

/** The day-30 check-in. The third answer is the quote the manager approves for publishing. */
export const CHECKIN_QUESTIONS = [
  { key: "hoped", label: "What did you hope the pilot would fix?" },
  { key: "changed", label: "What changed on your team's calls, if anything?" },
  { key: "quote", label: "What would you tell another sales manager about it, in a sentence or two?" },
  { key: "nearly_stopped", label: "What nearly made you stop using it?" },
  { key: "next", label: "Will you keep using it after the pilot? On which plan?" },
] as const;

export type CheckinKey = (typeof CHECKIN_QUESTIONS)[number]["key"];

export const PARTNER_FIT = [
  `${PARTNER.minReps} or more SDRs or BDRs who make cold calls.`,
  "A named manager or team lead who runs the pilot.",
  "A start date within the next two weeks.",
];
