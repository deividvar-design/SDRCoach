/**
 * One-time: creates the SDRCoach products and prices in the Stripe account the key belongs to
 * (run once with a test key, once with a live key) and prints the env lines to paste.
 *
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import Stripe from "stripe";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set");
  process.exit(1);
}
const stripe = new Stripe(key);

const PLANS = [
  { id: "starter", name: "SDRCoach Starter", monthly: 9900, annual: 7900, calls: 40 },
  { id: "team", name: "SDRCoach Team", monthly: 17900, annual: 14900, calls: 100 },
];

const out = [];
for (const p of PLANS) {
  const product = await stripe.products.create({
    name: p.name,
    description: `${p.calls} practice calls per seat per month`,
    metadata: { plan: p.id },
  });
  const monthly = await stripe.prices.create({ product: product.id, unit_amount: p.monthly, currency: "usd", recurring: { interval: "month" }, nickname: `${p.id} monthly`, metadata: { plan: p.id, interval: "month" } });
  const annual = await stripe.prices.create({ product: product.id, unit_amount: p.annual * 12, currency: "usd", recurring: { interval: "year" }, nickname: `${p.id} annual`, metadata: { plan: p.id, interval: "year" } });
  out.push(`STRIPE_PRICE_${p.id.toUpperCase()}_MONTHLY=${monthly.id}`, `STRIPE_PRICE_${p.id.toUpperCase()}_ANNUAL=${annual.id}`);
}

const portal = await stripe.billingPortal.configurations.create({
  business_profile: { headline: "SDRCoach billing" },
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: { enabled: true, default_allowed_updates: ["quantity", "price"], proration_behavior: "create_prorations", products: [] },
  },
});

console.log(`\nAdd to your environment (${key.startsWith("sk_live") ? "LIVE" : "TEST"} mode):\n${out.join("\n")}\n\nPortal configuration: ${portal.id} (set as default in the Stripe dashboard under Billing → Customer portal)\nThen create a webhook endpoint for ${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain"}/api/webhooks/stripe with events:\n  checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed\nand put its signing secret in STRIPE_WEBHOOK_SECRET.\n`);
