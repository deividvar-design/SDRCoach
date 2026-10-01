/**
 * One-time: creates the 100 Dials products and prices in the Stripe account the key belongs to
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

// Amounts in cents per seat per month; the script multiplies by the interval. Keep in sync with src/lib/billing/plans.ts.
const PLANS = [
  { id: "starter", name: "100 Dials Starter", calls: 40, usd: { monthly: 5900, quarterly: 5300, annual: 4700 }, eur: { monthly: 5500, quarterly: 4900, annual: 4400 } },
  { id: "team", name: "100 Dials Team", calls: 100, usd: { monthly: 15900, quarterly: 14300, annual: 12700 }, eur: { monthly: 14900, quarterly: 13400, annual: 11900 } },
];
const MONTHS = { monthly: 1, quarterly: 3, annual: 12 };
const RECURRING = { monthly: { interval: "month" }, quarterly: { interval: "month", interval_count: 3 }, annual: { interval: "year" } };
const INTERVAL_KEY = { monthly: "month", quarterly: "quarter", annual: "year" };

/** One multi-currency price: USD default, EUR as a currency option. Checkout picks with its `currency` param. */
function priceParams(product, p, period) {
  return {
    product,
    currency: "usd",
    unit_amount: p.usd[period] * MONTHS[period],
    currency_options: { eur: { unit_amount: p.eur[period] * MONTHS[period] } },
    recurring: RECURRING[period],
    nickname: `${p.id} ${period}`,
    metadata: { plan: p.id, interval: INTERVAL_KEY[period] },
  };
}

// `--eur`: add the euro amount to the prices already in the environment (STRIPE_PRICE_*), then stop.
if (process.argv.includes("--eur")) {
  for (const p of PLANS) {
    for (const period of ["monthly", "quarterly", "annual"]) {
      const id = process.env[`STRIPE_PRICE_${p.id.toUpperCase()}_${period.toUpperCase()}`];
      if (!id) {
        console.warn(`STRIPE_PRICE_${p.id.toUpperCase()}_${period.toUpperCase()} is not set; skipping`);
        continue;
      }
      await stripe.prices.update(id, { currency_options: { eur: { unit_amount: p.eur[period] * MONTHS[period] } } });
      console.log(`${id}: eur ${(p.eur[period] * MONTHS[period]) / 100} added`);
    }
  }
  console.log("\nDone. Nothing to change in Vercel; the same price ids now carry both currencies.");
  process.exit(0);
}

// `--coupons`: create the two fixed-id coupons the app applies itself, then stop. Safe to re-run.
if (process.argv.includes("--coupons")) {
  const wanted = [
    { id: "TRIAL15", percent_off: 15, duration: "repeating", duration_in_months: 3, name: "Upgraded before the trial ended" },
    { id: "COMEBACK20", percent_off: 20, duration: "repeating", duration_in_months: 3, name: "Came back after the trial" },
  ];
  for (const c of wanted) {
    const existing = await stripe.coupons.retrieve(c.id).catch(() => null);
    if (existing) {
      console.log(`${c.id} already exists (${existing.percent_off}% off, ${existing.duration}${existing.duration_in_months ? ` ${existing.duration_in_months} months` : ""}).`);
      continue;
    }
    await stripe.coupons.create(c);
    console.log(`Created ${c.id}: ${c.percent_off}% off for ${c.duration_in_months} months.`);
  }
  process.exit(0);
}

// `--quarterly-only`: products already exist (created by an earlier run); add the quarterly price to each and stop.
if (process.argv.includes("--quarterly-only")) {
  const lines = [];
  const { data: products } = await stripe.products.list({ active: true, limit: 100 });
  for (const p of PLANS) {
    const product = products.find((x) => x.metadata?.plan === p.id);
    if (!product) {
      console.error(`No active product with metadata.plan=${p.id}. Run without --quarterly-only to create everything.`);
      process.exit(1);
    }
    const quarterly = await stripe.prices.create(priceParams(product.id, p, "quarterly"));
    lines.push(`STRIPE_PRICE_${p.id.toUpperCase()}_QUARTERLY=${quarterly.id}`);
  }
  console.log(`\nAdd to your environment:\n${lines.join("\n")}\n\nThen in Billing → Customer portal, edit the default configuration and add the quarterly prices to the products customers may switch between.`);
  process.exit(0);
}

const out = [];
const portalProducts = [];
for (const p of PLANS) {
  const product = await stripe.products.create({
    name: p.name,
    description: `${p.calls} practice calls per seat per month`,
    // Stripe Tax needs a category: SaaS for business use.
    tax_code: "txcd_10103001",
    metadata: { plan: p.id },
  });
  const monthly = await stripe.prices.create(priceParams(product.id, p, "monthly"));
  const quarterly = await stripe.prices.create(priceParams(product.id, p, "quarterly"));
  const annual = await stripe.prices.create(priceParams(product.id, p, "annual"));
  out.push(`STRIPE_PRICE_${p.id.toUpperCase()}_MONTHLY=${monthly.id}`, `STRIPE_PRICE_${p.id.toUpperCase()}_QUARTERLY=${quarterly.id}`, `STRIPE_PRICE_${p.id.toUpperCase()}_ANNUAL=${annual.id}`);
  portalProducts.push({ product: product.id, prices: [monthly.id, quarterly.id, annual.id] });
}

const portal = await stripe.billingPortal.configurations.create({
  business_profile: { headline: "100 Dials billing" },
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: { enabled: true, default_allowed_updates: ["quantity", "price"], proration_behavior: "create_prorations", products: portalProducts },
  },
});

// Optional: register the webhook endpoint too, so nothing is left to click through in the dashboard.
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
let webhookLine = "";
if (appUrl && process.argv.includes("--webhook")) {
  const endpoint = await stripe.webhookEndpoints.create({
    url: `${appUrl.replace(/\/$/, "")}/api/webhooks/stripe`,
    enabled_events: ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed"],
    description: "100 Dials billing sync",
  });
  webhookLine = `STRIPE_WEBHOOK_SECRET=${endpoint.secret}`;
  out.push(webhookLine);
}

console.log(`\nAdd to your environment (${key.includes("_live_") ? "LIVE" : "TEST"} mode):\n${out.join("\n")}\n\nPortal configuration: ${portal.id} (set as default in the Stripe dashboard under Billing → Customer portal)\n${webhookLine ? "Webhook endpoint registered and its signing secret is in the list above." : `Then create a webhook endpoint for ${appUrl ?? "https://your-domain"}/api/webhooks/stripe (or re-run with --webhook and NEXT_PUBLIC_APP_URL set) with events:`}\n  checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed\nand put its signing secret in STRIPE_WEBHOOK_SECRET.\n`);
