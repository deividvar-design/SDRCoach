import "server-only";
import { FOUNDING } from "./plans";
import { priceCatalog } from "./stripe";

export interface FoundingOffer {
  /** ISO timestamp the offer ends. */
  until: string;
  untilLabel: string;
  price: typeof FOUNDING.price;
  /** Offered because the workspace is a founding partner, after the public window closed. */
  partner?: boolean;
}

/** True while the deadline is ahead. Exported for the pure check; the offer below also needs the Stripe prices. */
export function foundingOpen(now = Date.now()) {
  return now < new Date(FOUNDING.until).getTime();
}

/**
 * Founding pricing until the deadline, for Starter and Team alike. Null once the date has passed, and null until the
 * founding prices exist in Stripe, so the page never shows a price checkout cannot charge.
 */
export async function foundingOffer(org?: { partner_since: string | null } | null, now = Date.now()): Promise<FoundingOffer | null> {
  if (!priceCatalog().foundingConfigured) return null;
  if (foundingOpen(now)) return { until: FOUNDING.until, untilLabel: FOUNDING.untilLabel, price: FOUNDING.price };
  // Founding partners keep the founding price after the public window: the program promises it for a year.
  if (org?.partner_since) return { until: new Date(new Date(org.partner_since).getTime() + 400 * 86_400_000).toISOString(), untilLabel: FOUNDING.untilLabel, price: FOUNDING.price, partner: true };
  return null;
}
