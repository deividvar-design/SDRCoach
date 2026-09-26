import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "SDRCoach" } });
  return client;
}

export type PaidPlanId = "starter" | "team";
export type Interval = "month" | "year";

export interface PriceCatalog {
  /** price id -> plan + interval */
  byPrice: Record<string, { plan: PaidPlanId; interval: Interval }>;
  /** plan + interval -> price id */
  priceFor(plan: PaidPlanId, interval: Interval): string | null;
}

/** Price ids come from env so test and live mode stay separate. Created by `pnpm stripe:setup`. */
export function priceCatalog(env: NodeJS.ProcessEnv = process.env): PriceCatalog {
  const table: [PaidPlanId, Interval, string | undefined][] = [
    ["starter", "month", env.STRIPE_PRICE_STARTER_MONTHLY],
    ["starter", "year", env.STRIPE_PRICE_STARTER_ANNUAL],
    ["team", "month", env.STRIPE_PRICE_TEAM_MONTHLY],
    ["team", "year", env.STRIPE_PRICE_TEAM_ANNUAL],
  ];
  const byPrice: PriceCatalog["byPrice"] = {};
  for (const [plan, interval, id] of table) if (id) byPrice[id] = { plan, interval };
  return {
    byPrice,
    priceFor: (plan, interval) => table.find(([p, i]) => p === plan && i === interval)?.[2] ?? null,
  };
}
