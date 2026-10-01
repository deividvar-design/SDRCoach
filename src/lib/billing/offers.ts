import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/types/database";

/**
 * Discounts the app applies itself at checkout. Coupon ids are fixed and created by `pnpm stripe:setup --coupons`
 * in each Stripe mode; if a coupon is missing, checkout silently runs without it.
 */
export interface Offer {
  id: "trial15" | "comeback20";
  coupon: "TRIAL15" | "COMEBACK20";
  percent: number;
  /** ISO timestamp after which the offer no longer applies. */
  until: string;
  /** One line for banners and emails. */
  line: string;
}

const DAY = 86_400_000;
/** How long the break-up email's discount stays open. */
export const COMEBACK_DAYS = 7;

/** The comeback offer runs to the end of the seventh day (UTC), so the date in the email is good all day. */
export function comebackUntil(sentAt: string | Date) {
  const d = new Date(new Date(sentAt).getTime() + COMEBACK_DAYS * DAY);
  d.setUTCHours(23, 59, 59, 0);
  return d;
}

type Org = Pick<Organization, "id" | "plan" | "trial_ends_at" | "stripe_subscription_id">;

export async function currentOffer(org: Org, now = Date.now()): Promise<Offer | null> {
  if (org.stripe_subscription_id && org.plan !== "canceled") return null;

  if (org.plan === "trial" && new Date(org.trial_ends_at).getTime() > now) {
    return { id: "trial15", coupon: "TRIAL15", percent: 15, until: org.trial_ends_at, line: "15% off your first three months if you upgrade before the trial ends. Applied at checkout." };
  }

  if (org.plan === "trial" || org.plan === "canceled") {
    const { data } = await createAdminClient().from("email_log").select("sent_at").eq("org_id", org.id).eq("kind", "chase_breakup").maybeSingle();
    if (data) {
      const until = comebackUntil(data.sent_at);
      if (until.getTime() > now) return { id: "comeback20", coupon: "COMEBACK20", percent: 20, until: until.toISOString(), line: "20% off your first three months, from our last email. Applied at checkout." };
    }
  }
  return null;
}
