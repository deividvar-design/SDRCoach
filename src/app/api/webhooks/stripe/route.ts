import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceCatalog, stripe } from "@/lib/billing/stripe";
import { handleStripeEvent, type SyncDeps } from "@/lib/billing/sync";
import { sendLifecycle } from "@/lib/email/lifecycle";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 501 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad signature" }, { status: 400 });
  }

  const db = createAdminClient();
  const deps: SyncDeps = {
    catalog: priceCatalog(),
    recordEvent: async (id, type) => {
      const { error } = await db.from("billing_events").insert({ id, type });
      return !error; // unique violation means we've seen it
    },
    findOrgId: async ({ orgId, customerId, subscriptionId }) => {
      if (orgId) {
        const { data } = await db.from("organizations").select("id").eq("id", orgId).maybeSingle();
        if (data) return data.id;
      }
      if (customerId) {
        const { data } = await db.from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
        if (data) return data.id;
      }
      if (subscriptionId) {
        const { data } = await db.from("organizations").select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
        if (data) return data.id;
      }
      return null;
    },
    patchOrg: async (orgId, patch) => {
      const { error } = await db.from("organizations").update(patch).eq("id", orgId);
      if (error) throw new Error(error.message);
    },
    retrieveSubscription: (id) => stripe().subscriptions.retrieve(id),
    notify: async (orgId, kind) => {
      await sendLifecycle(orgId, kind).catch((err) => console.error("lifecycle email failed", kind, err));
    },
  };

  try {
    const result = await handleStripeEvent(event, deps);
    return NextResponse.json(result);
  } catch (err) {
    console.error("stripe webhook failed", event.type, err);
    // 500 makes Stripe retry; the billing_events row is already written, so remove it to allow the retry to run.
    await db.from("billing_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
