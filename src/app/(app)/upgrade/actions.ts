"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { priceCatalog, stripe, stripeConfigured } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";

const Body = z.object({
  plan: z.enum(["starter", "team"]),
  interval: z.enum(["month", "year"]),
  seats: z.coerce.number().int().min(1).max(500),
});

/** Creates (or reuses) the Stripe customer for the org and sends the manager to Checkout. */
export async function startCheckout(formData: FormData) {
  const parsed = Body.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/upgrade?error=invalid");
  if (!stripeConfigured()) redirect("/upgrade?error=billing_unavailable");

  const viewer = await requireManager();
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

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: viewer.org.id,
    line_items: [{ price, quantity: parsed.data.seats }],
    success_url: `${SITE.url}/settings?checkout=success`,
    cancel_url: `${SITE.url}/upgrade?checkout=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    ...(process.env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: true } } : {}),
    subscription_data: { metadata: { org_id: viewer.org.id, plan: parsed.data.plan } },
    metadata: { org_id: viewer.org.id },
  });

  if (!session.url) redirect("/upgrade?error=no_session");
  redirect(session.url);
}

/** Stripe's hosted portal: change seats, switch plan, update card, cancel, download invoices. */
export async function openBillingPortal() {
  if (!stripeConfigured()) redirect("/settings?error=billing_unavailable");
  const viewer = await requireManager();
  if (!viewer.org.stripe_customer_id) redirect("/upgrade");
  const session = await stripe().billingPortal.sessions.create({
    customer: viewer.org.stripe_customer_id,
    return_url: `${SITE.url}/settings`,
  });
  redirect(session.url);
}
