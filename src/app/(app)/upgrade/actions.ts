"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { priceCatalog, stripe, stripeConfigured } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";
import { PLANS } from "@/lib/billing/plans";

const Body = z.object({
  plan: z.enum(["starter", "team"]),
  interval: z.enum(["month", "quarter", "year"]),
  currency: z.enum(["usd", "eur"]).default("usd"),
  seats: z.coerce.number().int().min(1).max(500),
});

/** Creates (or reuses) the Stripe customer for the org and sends the manager to Checkout. */
export async function startCheckout(formData: FormData) {
  const parsed = Body.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/upgrade?error=invalid");
  if (!stripeConfigured()) redirect("/upgrade?error=billing_unavailable");

  const viewer = await requireManager();
  const minSeats = PLANS.find((p) => p.id === parsed.data.plan)?.minSeats ?? 1;
  if (parsed.data.seats < minSeats) redirect("/upgrade?error=invalid");
  const price = priceCatalog().priceFor(parsed.data.plan, parsed.data.interval);
  if (!price) redirect("/upgrade?error=price_missing");

  const db = createAdminClient();
  let customer = viewer.org.stripe_customer_id;
  if (!customer) {
    const created = await stripe().customers.create({
      email: viewer.email,
      name: viewer.org.name,
      metadata: { org_id: viewer.org.id },
    });
    customer = created.id;
    await db.from("organizations").update({ stripe_customer_id: customer }).eq("id", viewer.org.id);
  }

  if (viewer.org.stripe_subscription_id && viewer.org.plan !== "canceled") redirect("/settings?error=already_subscribed");

  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      // Required by Stripe when collecting tax ids / addresses for an existing customer.
      customer_update: { name: "auto", address: "auto" },
      client_reference_id: viewer.org.id,
      line_items: [{ price, quantity: parsed.data.seats }],
      // Prices carry both currencies; this picks which one the buyer is charged in.
      currency: parsed.data.currency,
      success_url: `${SITE.url}/settings?checkout=success`,
      cancel_url: `${SITE.url}/upgrade?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      ...(process.env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: true } } : {}),
      subscription_data: { metadata: { org_id: viewer.org.id, plan: parsed.data.plan } },
      metadata: { org_id: viewer.org.id },
    });
    url = session.url;
  } catch (err) {
    console.error("stripe checkout failed", err);
    // Surface Stripe's own reason to the manager: it is almost always a configuration problem they can act on.
    const reason = err instanceof Error ? err.message.slice(0, 160) : "";
    redirect(`/upgrade?error=stripe&reason=${encodeURIComponent(reason)}`);
  }

  if (!url) redirect("/upgrade?error=no_session");
  redirect(url);
}

/** Stripe's hosted portal: change seats, switch plan, update card, cancel, download invoices. */
export async function openBillingPortal() {
  if (!stripeConfigured()) redirect("/settings?error=billing_unavailable");
  const viewer = await requireManager();
  if (!viewer.org.stripe_customer_id) redirect("/upgrade");
  let url: string;
  try {
    const session = await stripe().billingPortal.sessions.create({ customer: viewer.org.stripe_customer_id, return_url: `${SITE.url}/settings` });
    url = session.url;
  } catch (err) {
    console.error("stripe portal failed", err);
    redirect("/settings?error=stripe");
  }
  redirect(url);
}
