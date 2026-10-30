import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "100 Dials" } });
  return client;
}

export type PaidPlanId = "starter" | "team";
export type Interval = "month" | "quarter" | "year";

export interface PriceCatalog {
  /** price id -> plan + interval. Founding prices map to the Starter plan. */
  byPrice: Record<string, { plan: PaidPlanId; interval: Interval; founding?: boolean }>;
  /** plan + interval -> price id. With `founding`, the locked launch price for Starter when it is configured. */
  priceFor(plan: PaidPlanId, interval: Interval, opts?: { founding?: boolean }): string | null;
  /** All three founding prices exist in the environment. */
  foundingConfigured: boolean;
}

/** Price ids come from env so test and live mode stay separate. Created by `pnpm stripe:setup`. */
export function priceCatalog(env: NodeJS.ProcessEnv = process.env): PriceCatalog {
  const table: [PaidPlanId, Interval, string | undefined, boolean][] = [
    ["starter", "month", env.STRIPE_PRICE_STARTER_MONTHLY, false],
    ["starter", "quarter", env.STRIPE_PRICE_STARTER_QUARTERLY, false],
    ["starter", "year", env.STRIPE_PRICE_STARTER_ANNUAL, false],
    ["team", "month", env.STRIPE_PRICE_TEAM_MONTHLY, false],
    ["team", "quarter", env.STRIPE_PRICE_TEAM_QUARTERLY, false],
    ["team", "year", env.STRIPE_PRICE_TEAM_ANNUAL, false],
    ["starter", "month", env.STRIPE_PRICE_FOUNDING_MONTHLY, true],
    ["starter", "quarter", env.STRIPE_PRICE_FOUNDING_QUARTERLY, true],
    ["starter", "year", env.STRIPE_PRICE_FOUNDING_ANNUAL, true],
  ];
  const byPrice: PriceCatalog["byPrice"] = {};
  for (const [plan, interval, id, founding] of table) if (id) byPrice[id] = founding ? { plan, interval, founding } : { plan, interval };
  const founding = table.filter(([, , , f]) => f);
  return {
    byPrice,
    foundingConfigured: founding.every(([, , id]) => Boolean(id)),
    priceFor: (plan, interval, opts) => table.find(([p, i, id, f]) => p === plan && i === interval && f === Boolean(opts?.founding) && Boolean(id))?.[2] ?? null,
  };
}

/** The coupons the app applies itself, created in the current Stripe mode on first use. Safe to call often. */
const COUPONS: Record<string, { percent_off: number; duration: "once" | "repeating"; duration_in_months?: number; name: string }> = {
  TRIAL15: { percent_off: 15, duration: "repeating", duration_in_months: 3, name: "Upgraded before the trial ended" },
  COMEBACK20: { percent_off: 20, duration: "repeating", duration_in_months: 3, name: "Came back after the trial" },
  REFERRAL20: { percent_off: 20, duration: "repeating", duration_in_months: 3, name: "Referred by another team" },
  REFERRALMONTH: { percent_off: 100, duration: "once", name: "A team you referred subscribed: one month free" },
};

export async function ensureCoupon(id: string) {
  const spec = COUPONS[id];
  if (!spec) return;
  const existing = await stripe().coupons.retrieve(id).catch(() => null);
  if (existing) return;
  await stripe().coupons.create({ id, ...spec }).catch(() => undefined);
}
