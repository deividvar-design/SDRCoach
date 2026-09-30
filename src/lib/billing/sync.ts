import type Stripe from "stripe";
import type { PriceCatalog } from "./stripe";

/** The subset of an org row that billing touches. */
export interface OrgBillingPatch {
  plan?: string;
  seat_limit?: number;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  billing_interval?: "month" | "quarter" | "year" | null;
  billing_currency?: "usd" | "eur" | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

const ACTIVE = new Set<Stripe.Subscription.Status>(["active", "trialing"]);
const GRACE = new Set<Stripe.Subscription.Status>(["past_due"]);
const PAID_PLANS = new Set(["starter", "team"]);

/** Pure mapping from a Stripe subscription to what we store. */
export function subscriptionToPatch(sub: Stripe.Subscription, catalog: PriceCatalog): OrgBillingPatch {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const known = priceId ? catalog.byPrice[priceId] : undefined;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const patch: OrgBillingPatch = {
    stripe_customer_id: customer,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    billing_interval: known?.interval ?? null,
    billing_currency: sub.currency === "eur" || sub.currency === "usd" ? sub.currency : null,
    subscription_status: sub.status,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };

  if (ACTIVE.has(sub.status) || GRACE.has(sub.status)) {
    // Past due keeps access during Stripe's retry window; the status is shown in Settings.
    const metaPlan = sub.metadata?.plan;
    const plan = known?.plan ?? (metaPlan && PAID_PLANS.has(metaPlan) ? metaPlan : undefined);
    if (plan) patch.plan = plan;
    if (item?.quantity) patch.seat_limit = item.quantity;
  } else {
    patch.plan = "canceled";
  }
  return patch;
}

export interface OrgRef {
  id: string;
  stripe_subscription_id: string | null;
  plan: string;
}

export interface SyncDeps {
  catalog: PriceCatalog;
  /** Returns false when the event was already processed. */
  recordEvent(id: string, type: string): Promise<boolean>;
  findOrg(q: { orgId?: string | null; customerId?: string | null; subscriptionId?: string | null }): Promise<OrgRef | null>;
  patchOrg(orgId: string, patch: OrgBillingPatch): Promise<void>;
  retrieveSubscription(id: string): Promise<Stripe.Subscription>;
  notify?(orgId: string, kind: "subscription_started" | "payment_failed" | "subscription_canceled"): Promise<void>;
}

export type SyncResult = { handled: boolean; reason?: string; orgId?: string };

/** Webhook business logic, separated from HTTP and signature handling so it can be tested with fakes. */
export async function handleStripeEvent(event: Stripe.Event, deps: SyncDeps): Promise<SyncResult> {
  const fresh = await deps.recordEvent(event.id, event.type);
  if (!fresh) return { handled: false, reason: "duplicate" };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return { handled: false, reason: "not a subscription checkout" };
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const customer = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const org = await deps.findOrg({ orgId: session.metadata?.org_id ?? session.client_reference_id, customerId: customer });
      if (!org) return { handled: false, reason: "org not found" };
      const sub = await deps.retrieveSubscription(subId);
      await deps.patchOrg(org.id, subscriptionToPatch(sub, deps.catalog));
      await deps.notify?.(org.id, "subscription_started");
      return { handled: true, orgId: org.id };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const org = await deps.findOrg({ orgId: sub.metadata?.org_id, customerId: customer, subscriptionId: sub.id });
      if (!org) return { handled: false, reason: "org not found" };
      // A late event for a previous subscription must not clobber the current one.
      if (org.stripe_subscription_id && org.stripe_subscription_id !== sub.id && org.plan !== "canceled") {
        return { handled: false, reason: "stale subscription", orgId: org.id };
      }
      const patch = subscriptionToPatch(sub, deps.catalog);
      await deps.patchOrg(org.id, patch);
      if (event.type === "customer.subscription.deleted") await deps.notify?.(org.id, "subscription_canceled");
      return { handled: true, orgId: org.id };
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
      const org = await deps.findOrg({ customerId: customer });
      if (!org) return { handled: false, reason: "org not found" };
      await deps.notify?.(org.id, "payment_failed");
      return { handled: true, orgId: org.id };
    }
    default:
      return { handled: false, reason: `ignored ${event.type}` };
  }
}
