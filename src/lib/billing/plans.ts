/**
 * Plans. Prices are launch placeholders sized against unit cost:
 * a 6-minute call runs roughly $0.60–0.75 in voice + LLM + scoring, so every seat carries a call allowance.
 */
export interface Plan {
  id: "trial" | "starter" | "team" | "enterprise";
  name: string;
  tagline: string;
  monthlyPerSeat: number | null;
  /** Per seat per month when billed every three months. Offered in the app, not on the public pricing page. */
  quarterlyPerSeat: number | null;
  annualPerSeat: number | null;
  callsPerSeat: number | null;
  overagePerCall: number | null;
  minSeats: number;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For one rep or a small team getting on the phone.",
    monthlyPerSeat: 59,
    quarterlyPerSeat: 53,
    annualPerSeat: 47,
    callsPerSeat: 40,
    overagePerCall: 1.5,
    minSeats: 1,
    features: ["Live AI prospects at all three levels", "Scored report after every call", "Recordings, transcripts and replay", "Six practice personas plus your own targets", "Coaching view: skills by rep, top objections", "Streaks, personal bests, team leaderboard", "Email support"],
    cta: "Start free trial",
  },
  {
    id: "team",
    name: "Team",
    tagline: "For managers who coach with data.",
    monthlyPerSeat: 159,
    quarterlyPerSeat: 143,
    annualPerSeat: 127,
    callsPerSeat: 100,
    overagePerCall: 1.2,
    minSeats: 3,
    features: ["Everything in Starter", "100 calls per seat a month instead of 40", "Lower overage rate", "More room for call transcripts and scripts that ground your prospects", "Priority support"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For sales orgs with security and scale needs.",
    monthlyPerSeat: null,
    quarterlyPerSeat: null,
    annualPerSeat: null,
    callsPerSeat: null,
    overagePerCall: null,
    minSeats: 25,
    features: ["Everything in Team", "SSO (Google, Microsoft, SAML)", "Custom personas built with your enablement team", "Voice cloning for real target accounts", "Dedicated success manager", "Invoice billing and DPA"],
    cta: "Talk to sales",
  },
];

export const TRIAL = { calls: 10, days: 14 } as const;

export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "hello@100dials.com";

export type BillingInterval = "month" | "quarter" | "year";

export const INTERVALS: Record<BillingInterval, { label: string; months: number; billed: string; saving: string | null }> = {
  month: { label: "Monthly", months: 1, billed: "Billed monthly", saving: null },
  quarter: { label: "Quarterly", months: 3, billed: "Billed every 3 months", saving: "save 10%" },
  year: { label: "Annual", months: 12, billed: "Billed yearly", saving: "save 20%" },
};

export function pricePerSeat(plan: Plan, interval: BillingInterval) {
  return interval === "year" ? plan.annualPerSeat : interval === "quarter" ? plan.quarterlyPerSeat : plan.monthlyPerSeat;
}
