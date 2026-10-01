/**
 * Plans. Prices are launch placeholders sized against unit cost:
 * a 6-minute call runs roughly $0.60–0.75 in voice + LLM + scoring, so every seat carries a call allowance.
 */
import type { Currency } from "./currency";

/** Per seat per month for each billing interval, in one currency. Quarterly is offered in the app only. */
export interface PriceTable {
  month: number;
  quarter: number;
  year: number;
}

export interface Plan {
  id: "trial" | "starter" | "team" | "enterprise";
  name: string;
  tagline: string;
  /** Null on plans that are sold by conversation. */
  prices: Record<Currency, PriceTable> | null;
  callsPerSeat: number | null;
  overagePerCall: Record<Currency, number> | null;
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
    prices: { usd: { month: 59, quarter: 53, year: 47 }, eur: { month: 55, quarter: 49, year: 44 } },
    callsPerSeat: 40,
    overagePerCall: { usd: 1.5, eur: 1.4 },
    minSeats: 1,
    features: [
      "Live AI prospects at all three levels",
      "Scored coach report after every call",
      "Call recordings, transcripts and replay",
      "Six practice personas, three boss fights, plus your own targets",
      "Prospects grounded in your own call transcripts, up to 30 sources",
      "Coaching view: skills by rep, top objections",
      "Streaks, personal bests, team leaderboard, Monday digest",
      "Email support",
    ],
    cta: "Start free trial",
  },
  {
    id: "team",
    name: "Team",
    tagline: "For managers who coach with data.",
    prices: { usd: { month: 159, quarter: 143, year: 127 }, eur: { month: 149, quarter: 134, year: 119 } },
    callsPerSeat: 100,
    overagePerCall: { usd: 1.2, eur: 1.1 },
    minSeats: 3,
    features: ["Everything in Starter", "100 calls per seat a month instead of 40", "Lower overage rate", "Up to 100 knowledge sources instead of 30", "Priority support, same-day reply on working days"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For sales orgs with security and scale needs.",
    prices: null,
    callsPerSeat: null,
    overagePerCall: null,
    minSeats: 25,
    features: ["Everything in Team", "Volume pricing and a custom call allowance", "SAML single sign-on, set up with you", "Custom personas built with your enablement team", "Dedicated onboarding and a named contact", "Security review, DPA and invoice billing"],
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

export function pricePerSeat(plan: Plan, interval: BillingInterval, currency: Currency) {
  return plan.prices ? plan.prices[currency][interval] : null;
}
