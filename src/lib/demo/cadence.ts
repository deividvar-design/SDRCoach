/**
 * Karen demo leads: four short emails after the scored report, framed for teams (100 Dials is sold to companies,
 * not to individual reps). Day 1 trial, day 4 rematch, day 8 concierge (work emails only), day 14 close the loop.
 * The cron runs once a day, so each step is due a little before its day and never within two days of the last one.
 */

export type CadenceStep = 1 | 2 | 3 | 4;

interface StepDef {
  step: CadenceStep;
  day: number;
  /** Personal-email leads skip it: the concierge offer only makes sense for a company. */
  workOnly?: boolean;
}

export const CADENCE: readonly StepDef[] = [
  { step: 1, day: 1 },
  { step: 2, day: 4 },
  { step: 3, day: 8, workOnly: true },
  { step: 4, day: 14 },
];

/** Leads older than this are never started or continued, so a deploy does not mail old calls. */
export const CADENCE_WINDOW_DAYS = 21;
/** A second Karen call by the same address within this many days does not restart the cadence. */
export const NO_REENTRY_DAYS = 30;

const EARLY = 0.15;
const MIN_GAP_DAYS = 1.85;

export interface CadenceState {
  /** Cadence emails already sent (0 to 4). */
  sent: number;
  personal: boolean;
  /** Days since the Karen form was submitted. */
  ageDays: number;
  /** Days since the last cadence email, or null if none was sent. */
  daysSinceLast: number | null;
}

/** The step to send now, or null if nothing is due. Steps a lead does not get (workOnly) are skipped, never sent late. */
export function nextCadenceStep(s: CadenceState): CadenceStep | null {
  if (s.ageDays > CADENCE_WINDOW_DAYS) return null;
  if (s.daysSinceLast !== null && s.daysSinceLast < MIN_GAP_DAYS) return null;
  const next = CADENCE.find((d) => d.step > s.sent && !(d.workOnly && s.personal));
  if (!next) return null;
  return s.ageDays >= next.day - EARLY ? next.step : null;
}

const ROLE_ADDRESSES = new Set(["sales", "info", "hello", "hi", "contact", "admin", "team", "support", "office", "marketing", "bdr", "sdr", "growth", "ops"]);

/** "Kai" from display name, else a clean first name from a work address, else null (the email says "Hi there"). */
export function greetingName(displayName: string | null, email: string, personal: boolean) {
  const fromDisplay = displayName?.trim().split(/\s+/)[0];
  if (fromDisplay && /^[\p{L}'-]{2,30}$/u.test(fromDisplay)) return fromDisplay;
  if (personal) return null;
  const local = email.split("@")[0]?.split(/[._+-]/)[0] ?? "";
  if (!/^[a-z]{2,20}$/i.test(local) || ROLE_ADDRESSES.has(local.toLowerCase())) return null;
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}
