import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { handleStripeEvent, subscriptionToPatch, type SyncDeps } from "./sync";
import { priceCatalog } from "./stripe";

vi.mock("server-only", () => ({}));

const catalog = priceCatalog({ STRIPE_PRICE_TEAM_MONTHLY: "price_team_m", STRIPE_PRICE_STARTER_ANNUAL: "price_starter_y" } as unknown as NodeJS.ProcessEnv);

function sub(over: Partial<Stripe.Subscription> & { price?: string; qty?: number; periodEnd?: number } = {}): Stripe.Subscription {
  const { price = "price_team_m", qty = 5, periodEnd = 1_800_000_000, ...rest } = over;
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { org_id: "org-1" },
    items: { object: "list", data: [{ id: "si_1", price: { id: price } as Stripe.Price, quantity: qty, current_period_end: periodEnd } as Stripe.SubscriptionItem], has_more: false, url: "" },
    ...rest,
  } as unknown as Stripe.Subscription;
}

describe("subscriptionToPatch", () => {
  it("maps an active known price to the plan, seats and period", () => {
    const p = subscriptionToPatch(sub(), catalog);
    expect(p).toMatchObject({ plan: "team", seat_limit: 5, billing_interval: "month", subscription_status: "active", stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1", cancel_at_period_end: false });
    expect(p.current_period_end).toBe(new Date(1_800_000_000 * 1000).toISOString());
  });
  it("keeps access on past_due", () => {
    expect(subscriptionToPatch(sub({ status: "past_due" }), catalog)).toMatchObject({ plan: "team", subscription_status: "past_due" });
  });
  it("flags canceled subscriptions", () => {
    expect(subscriptionToPatch(sub({ status: "canceled" }), catalog).plan).toBe("canceled");
  });
  it("does not change the plan for an unknown price", () => {
    const p = subscriptionToPatch(sub({ price: "price_mystery" }), catalog);
    expect(p.plan).toBeUndefined();
    expect(p.billing_interval).toBeNull();
  });
});

function deps(over: Partial<SyncDeps> = {}) {
  const patches: { orgId: string; patch: unknown }[] = [];
  const notes: string[] = [];
  const d: SyncDeps = {
    catalog,
    recordEvent: async () => true,
    findOrgId: async (q) => (q.orgId === "org-1" || q.customerId === "cus_1" ? "org-1" : null),
    patchOrg: async (orgId, patch) => {
      patches.push({ orgId, patch });
    },
    retrieveSubscription: async () => sub(),
    notify: async (_o, kind) => {
      notes.push(kind);
    },
    ...over,
  };
  return { d, patches, notes };
}

const event = (type: string, object: unknown): Stripe.Event => ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;

describe("handleStripeEvent", () => {
  it("skips duplicates", async () => {
    const { d, patches } = deps({ recordEvent: async () => false });
    const r = await handleStripeEvent(event("customer.subscription.updated", sub()), d);
    expect(r).toEqual({ handled: false, reason: "duplicate" });
    expect(patches).toHaveLength(0);
  });
  it("syncs on checkout completion by retrieving the subscription", async () => {
    const { d, patches, notes } = deps();
    const r = await handleStripeEvent(event("checkout.session.completed", { mode: "subscription", subscription: "sub_1", customer: "cus_1", metadata: { org_id: "org-1" } }), d);
    expect(r).toMatchObject({ handled: true, orgId: "org-1" });
    expect(patches[0]!.patch).toMatchObject({ plan: "team", seat_limit: 5 });
    expect(notes).toEqual(["subscription_started"]);
  });
  it("syncs subscription updates and notifies on deletion", async () => {
    const { d, patches, notes } = deps();
    await handleStripeEvent(event("customer.subscription.deleted", sub({ status: "canceled" })), d);
    expect(patches[0]!.patch).toMatchObject({ plan: "canceled" });
    expect(notes).toEqual(["subscription_canceled"]);
  });
  it("notifies on payment failure", async () => {
    const { d, notes } = deps();
    await handleStripeEvent(event("invoice.payment_failed", { customer: "cus_1" }), d);
    expect(notes).toEqual(["payment_failed"]);
  });
  it("ignores unrelated events", async () => {
    const { d } = deps();
    expect((await handleStripeEvent(event("charge.succeeded", {}), d)).handled).toBe(false);
  });
});

describe("webhook signature", () => {
  it("round-trips through Stripe's own test header generator", () => {
    const stripe = new Stripe("sk_test_placeholder");
    const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "customer.subscription.updated", data: { object: sub() } });
    const secret = "whsec_test_secret";
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const parsed = stripe.webhooks.constructEvent(payload, header, secret);
    expect(parsed.id).toBe("evt_sig");
    expect(() => stripe.webhooks.constructEvent(payload, header, "whsec_wrong")).toThrow();
  });
});
