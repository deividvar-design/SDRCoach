import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { FOUNDING } from "./plans";
import { priceCatalog } from "./stripe";

export interface FoundingOffer {
  left: number;
  total: number;
  price: typeof FOUNDING.price;
}

/**
 * Founding pricing while spots remain. A spot is a workspace with a live subscription, whatever the plan,
 * so the count is real and the page never claims scarcity that does not exist. Null once ten teams pay,
 * and null until the founding prices exist in Stripe, so the page never shows a price checkout cannot charge.
 */
export async function foundingOffer(): Promise<FoundingOffer | null> {
  if (!priceCatalog().foundingConfigured) return null;
  try {
    const { count } = await createAdminClient().from("organizations").select("id", { count: "exact", head: true }).not("stripe_subscription_id", "is", null).neq("plan", "canceled");
    const left = Math.max(0, FOUNDING.teams - (count ?? 0));
    return left > 0 ? { left, total: FOUNDING.teams, price: FOUNDING.price } : null;
  } catch {
    // Better no founding block than a broken pricing page.
    return null;
  }
}
