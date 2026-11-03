import { pageMetadata } from "@/lib/seo";
import { AnchorStrip } from "@/components/pricing/anchor-strip";
import { PricingCalculator } from "@/components/pricing/calculator";
import { CompareTable } from "@/components/pricing/compare-table";
import { formatMoney } from "@/lib/billing/currency";
import { PlanGrid } from "@/components/billing/plan-grid";
import { SALES_EMAIL, TRIAL } from "@/lib/billing/plans";
import { viewerCurrency } from "@/lib/billing/currency-server";
import { CtaBand } from "@/components/marketing/sections";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { Guarantee } from "@/components/billing/guarantee";
import { foundingOffer } from "@/lib/billing/founding";
import { FOUNDING, PLANS } from "@/lib/billing/plans";

export const metadata = pageMetadata({
  title: "Pricing: per-seat plans, ten free calls first",
  description: "Per-seat plans with a monthly call allowance, in dollars or euros, and a 30-day money-back guarantee on the first payment. Free trial: 10 calls, no card.",
  path: "/pricing",
  card: ["page", "pricing"],
});

const FAQ = [
  { q: "What counts as a call?", a: "A call that connects to the AI prospect. Dials that never connect are not counted. Calls end at eight minutes, with the prospect wrapping up the way a real one would." },
  { q: "Can seats move between reps?", a: "Yes. A seat is not tied to a person. Remove a rep who has left and invite the next one; the seat and its calls carry over immediately." },
  { q: "What happens after the trial?", a: "Dialling pauses and everything you built stays: targets, transcripts, scores. Pick a plan from inside the app and the team is calling again in a minute. There is no card on the trial, so nothing is ever charged by surprise." },
  { q: "Do you offer annual billing?", a: `Yes. Annual is 20% off and quarterly 10% off, per seat. Annual plans can be paid by invoice: email ${SALES_EMAIL} with the plan and seat count and we send a Stripe invoice with 30-day payment terms.` },
  { q: "Can we get custom personas?", a: "Yes, on every plan. Upload transcripts from Gong, Chorus, Apollo or your dialler and prospects start sounding like your market within minutes; Starter holds 30 sources, Team 100. Team also includes a personalised setup: we build your first prospects from your target accounts before your reps dial." },
  { q: "What is founding pricing?", a: `Until ${FOUNDING.untilLabel}, Starter is $${FOUNDING.price.starter.usd.month} and Team $${FOUNDING.price.team.usd.month} a seat a month, and a team that subscribes keeps that price for as long as it stays subscribed. Founding pricing does not combine with other discounts.` },
  { q: "Is there a money-back guarantee?", a: "Yes. If a paid plan isn't working for your team, email us within 30 days of your first payment and we refund it in full, no questions. It covers the first payment on a new subscription." },
  { q: "Which currency will we be charged in?", a: "Euros or US dollars, your choice at checkout. European companies see euro prices by default. Prices exclude VAT; EU companies with a VAT number are reverse-charged." },
  { q: "Is our data used to train models?", a: "No. Your transcripts and recordings are used only to ground your own team's prospects and grading." },
];

export default async function PricingPage() {
  const [currency, founding] = await Promise.all([viewerCurrency(), foundingOffer()]);
  const starter = PLANS.find((p) => p.id === "starter")!;
  const team = PLANS.find((p) => p.id === "team")!;
  const starterPrice = founding ? founding.price.starter[currency].month : starter.prices![currency].month;
  const teamPrice = founding ? founding.price.team[currency].month : team.prices![currency].month;
  return (
    <>
      <JsonLd data={faqLd(FAQ)} />
      <div className="mx-auto w-full max-w-6xl px-6">
        <section className="py-16 text-center">
          <h1 className="font-display text-5xl text-balance md:text-7xl">Practise on Karen before you practise on prospects.</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance">
            Per seat, with a monthly call allowance pooled across the team. Free trial: {TRIAL.calls} calls, {TRIAL.days} days, no card.
          </p>
          {founding && (
            <p className="bg-signal/10 text-signal-ink mx-auto mt-6 inline-block rounded-full px-4 py-1.5 text-sm font-medium">
              Founding pricing until {founding.untilLabel}: Starter {formatMoney(starterPrice, currency)}, Team {formatMoney(teamPrice, currency)} a seat, kept for as long as you stay subscribed.
            </p>
          )}
        </section>
      </div>

      <AnchorStrip price={starterPrice} currency={currency} />
      <PricingCalculator starterPrice={starterPrice} teamPrice={teamPrice} currency={currency} />

      <div id="plans" className="mx-auto w-full max-w-6xl px-6 py-11 md:py-16">
        <p className="text-muted-foreground mb-6 text-center text-sm">Less than one burned conversation per week.</p>
        <PlanGrid marketing currency={currency} founding={founding} />
        <Guarantee className="mx-auto mt-8 max-w-3xl" />
      </div>

      <CompareTable starterPrice={starterPrice} teamPrice={teamPrice} currency={currency} />

      <div className="mx-auto w-full max-w-6xl px-6 pb-8">
        <section className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl">Questions</h2>
          <dl className="mt-6 divide-y">
            {FAQ.map((f) => (
              <div key={f.q} className="grid gap-2 py-5 md:grid-cols-[1fr_1.6fr]">
                <dt className="font-medium">{f.q}</dt>
                <dd className="text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <CtaBand title="Start with ten free calls." body="Every plan begins as a trial. Upgrade from inside the app when the team is ready." secondary={{ href: "/karen", label: "Not ready? Try one call against Karen" }} link={{ href: `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Extended trial of 100 Dials")}`, label: "Talk to us about an extended trial", ctaId: "pricing_extended_trial" }} />
    </>
  );
}
