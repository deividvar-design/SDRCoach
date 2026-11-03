import "server-only";
import { FOUNDING } from "./plans";
import { priceCatalog } from "./stripe";

export interface FoundingOffer {
  /** ISO timestamp the offer ends. */
  until: string;
  untilLabel: string;
  price: typeof FOUNDING.price;
}

/** True while the deadline is ahead. Exported for the pure check; the offer below also needs the Stripe prices. */
export function foundingOpen(now = Date.now()) {
  return now < new Date(FOUNDING.until).getTime();
}

/**
 * Founding pricing until the deadline, for Starter and Team alike. Null once the date has passed, and null until the
 * founding prices exist in Stripe, so the page never shows a price checkout cannot charge.
 */
export async function foundingOffer(now = Date.now()): Promise<FoundingOffer | null> {
  if (!foundingOpen(now) || !priceCatalog().foundingConfigured) return null;
  return { until: FOUNDING.until, untilLabel: FOUNDING.untilLabel, price: FOUNDING.price };
}
