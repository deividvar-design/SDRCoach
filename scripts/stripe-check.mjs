/**
 * Read-only check of the Stripe account an environment points at. Run it against the production env to see
 * whether the key, the price ids and the webhook endpoint belong to the same mode, and what Stripe currently
 * says about one customer's subscription. Nothing is created or changed.
 *
 *   npx vercel env pull --environment=production .env.production.local
 *   node scripts/stripe-check.mjs --env .env.production.local [--customer cus_...]
 */
import { readFileSync, existsSync } from "node:fs";
import Stripe from "stripe";

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const envFile = flag("--env") ?? ".env.local";
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(`STRIPE_SECRET_KEY is not set in ${envFile}`);
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.includes("_live_") ? "LIVE" : key.includes("_test_") ? "TEST" : "unknown (restricted key?)";
console.log(`Key: ${mode} mode, from ${envFile}`);

const PRICE_VARS = ["STRIPE_PRICE_STARTER_MONTHLY", "STRIPE_PRICE_STARTER_QUARTERLY", "STRIPE_PRICE_STARTER_ANNUAL", "STRIPE_PRICE_TEAM_MONTHLY", "STRIPE_PRICE_TEAM_QUARTERLY", "STRIPE_PRICE_TEAM_ANNUAL", "STRIPE_PRICE_FOUNDING_MONTHLY", "STRIPE_PRICE_FOUNDING_QUARTERLY", "STRIPE_PRICE_FOUNDING_ANNUAL"];
console.log("\nPrices:");
for (const name of PRICE_VARS) {
  const id = process.env[name];
  if (!id) {
    console.log(`  ${name}: not set`);
    continue;
  }
  try {
    const p = await stripe.prices.retrieve(id);
    console.log(`  ${name}: ok, ${p.livemode ? "live" : "test"}, ${p.unit_amount / 100} ${p.currency}/${p.recurring?.interval_count ?? 1} ${p.recurring?.interval}${p.active ? "" : ", INACTIVE"}`);
  } catch (err) {
    console.log(`  ${name}: ${id} -> ${err.message}`);
  }
}

console.log("\nWebhook endpoints in this mode:");
const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
if (!endpoints.data.length) console.log("  none");
for (const e of endpoints.data) {
  console.log(`  ${e.url}\n    status ${e.status}, api ${e.api_version ?? "account default"}, events: ${e.enabled_events.join(", ")}`);
}
const secret = process.env.STRIPE_WEBHOOK_SECRET;
console.log(`  STRIPE_WEBHOOK_SECRET is ${secret ? `set (${secret.slice(0, 8)}...)` : "NOT set"}. Compare with the signing secret of the 100dials.com endpoint in the dashboard.`);

const customer = flag("--customer");
if (customer) {
  console.log(`\nSubscriptions for ${customer}:`);
  try {
    const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 10 });
    if (!subs.data.length) console.log("  none");
    for (const s of subs.data) {
      const item = s.items.data[0];
      const end = item?.current_period_end ?? s.current_period_end;
      console.log(`  ${s.id}: ${s.status}, ${s.livemode ? "live" : "test"}, price ${item?.price.id}, qty ${item?.quantity}, period end ${end ? new Date(end * 1000).toISOString().slice(0, 10) : "?"}, cancel_at_period_end ${s.cancel_at_period_end}, cancel_at ${s.cancel_at ? new Date(s.cancel_at * 1000).toISOString().slice(0, 10) : "none"}, canceled_at ${s.canceled_at ? new Date(s.canceled_at * 1000).toISOString().slice(0, 10) : "none"}`);
    }
  } catch (err) {
    console.log(`  ${err.message}`);
  }
}

console.log("\nLast 10 subscription events in this mode (pending_webhooks > 0 means Stripe is still retrying a delivery):");
const events = await stripe.events.list({ limit: 10, types: ["customer.subscription.updated", "customer.subscription.deleted", "checkout.session.completed"] });
for (const ev of events.data) {
  const o = ev.data.object;
  console.log(`  ${new Date(ev.created * 1000).toISOString()} ${ev.type} ${o.id} pending_webhooks=${ev.pending_webhooks}`);
}
