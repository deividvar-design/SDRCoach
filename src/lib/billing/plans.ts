/**
 * Plans. Prices are launch placeholders sized against unit cost:
 * a 6-minute call runs roughly $0.60–0.75 in voice + LLM + scoring, so every seat carries a call allowance.
 */
export interface Plan {
  id: "trial" | "starter" | "team" | "enterprise";
  name: string;
  tagline: string;
  monthlyPerSeat: number | null;
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
    tagline: "For a small team getting reps on the phone.",
    monthlyPerSeat: 99,
    annualPerSeat: 79,
    callsPerSeat: 40,
    overagePerCall: 1.5,
    minSeats: 2,
    features: ["Live AI prospects at all three levels", "Scored report after every call", "Six practice personas plus your own targets", "Streaks, personal bests, team leaderboard", "Email support"],
    cta: "Start free trial",
  },
  {
    id: "team",
    name: "Team",
    tagline: "For managers who coach with data.",
    monthlyPerSeat: 179,
    annualPerSeat: 149,
    callsPerSeat: 100,
    overagePerCall: 1.2,
    minSeats: 3,
    features: ["Everything in Starter", "Ground prospects in your real call transcripts", "Per-rep drill-down and trend reports", "Assignments with due dates", "Call recordings and replay", "Priority support"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For sales orgs with security and scale needs.",
    monthlyPerSeat: null,
    annualPerSeat: null,
    callsPerSeat: null,
    overagePerCall: null,
    minSeats: 25,
    features: ["Everything in Team", "SSO (Google, Microsoft, SAML)", "Custom personas built with your enablement team", "Voice cloning for real target accounts", "Dedicated success manager", "Invoice billing and DPA"],
    cta: "Talk to sales",
  },
];

export const TRIAL = { calls: 10, days: 14 } as const;

export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "hello@sdrcoach.io";
