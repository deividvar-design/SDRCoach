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
  minSeats: number;
  features: string[];
  cta: string;
  highlight?: boolean;
  /** A plan-specific promise, shown under the features. */
  guarantee?: string;
}

/**
 * Founding pricing: every team that subscribes before the deadline keeps these prices for as long as it stays
 * subscribed. Shown only while the founding Stripe prices exist and the date has not passed; see founding.ts.
 * The quarterly and annual figures carry the same 10% and 20% off as the list prices.
 */
export const FOUNDING = {
  until: "2026-11-30T23:59:59Z",
  untilLabel: "30 November",
  price: {
    starter: { usd: { month: 49, quarter: 44, year: 39 }, eur: { month: 46, quarter: 41, year: 37 } },
    team: { usd: { month: 79, quarter: 71, year: 63 }, eur: { month: 74, quarter: 67, year: 59 } },
  } as Record<"starter" | "team", Record<Currency, PriceTable>>,
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For one rep or a small team getting on the phone.",
    prices: { usd: { month: 79, quarter: 71, year: 63 }, eur: { month: 75, quarter: 67, year: 59 } },
    callsPerSeat: 40,
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
    callsPerSeat: 80,
    minSeats: 1,
    features: ["Everything in Starter", "80 calls per seat a month instead of 40, pooled across the team", "Up to 100 knowledge sources instead of 30", "Personalised setup: we build your first prospects from your target accounts", "Priority support, same-day reply on working days"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For sales orgs with security and scale needs.",
    prices: null,
    callsPerSeat: null,
    minSeats: 25,
    features: ["Everything in Team", "Volume pricing and a custom call allowance", "SAML single sign-on, set up with you", "Custom personas built with your enablement team", "Dedicated onboarding and a named contact", "Security review, DPA and invoice billing"],
    cta: "Talk to sales",
  },
];

export const TRIAL = { calls: 5, days: 14 } as const;

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
