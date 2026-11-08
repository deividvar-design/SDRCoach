import { CtaLink } from "@/components/analytics/cta-link";
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
  title: "Pricing: per-seat plans, five free calls first",
  description: `Pay per rep, in dollars or euros, with a 30-day money-back guarantee on your first payment. Free trial: ${TRIAL.calls} calls, no card.`,
  path: "/pricing",
  card: ["page", "pricing"],
});

const FAQ = [
  { q: "What counts as a call?", a: "Any call that connects to the AI prospect. If it doesn't connect, it doesn't count. Calls stop at eight minutes, and the prospect wraps up like a real one would." },
  { q: "Can seats move between reps?", a: "Yes. A seat isn't tied to a person. Remove a rep who's left and invite the next one. The seat and its calls carry over right away." },
  { q: "What happens after the trial?", a: "Calling pauses, and everything you built stays: targets, transcripts and scores. Pick a plan inside the app and your team is calling again in a minute. There's no card on the trial, so you're never charged by surprise." },
  { q: "Do you offer annual billing?", a: `Yes. Annual is 20% off and quarterly is 10% off, per seat. You can pay annual plans by invoice. Email ${SALES_EMAIL} with the plan and seat count, and we'll send a Stripe invoice with 30-day payment terms.` },
  { q: "Can we get custom personas?", a: "Yes, on every plan. Upload call transcripts from Gong, Chorus, Apollo or your dialer. Within minutes, your prospects start to sound like your buyers. Starter learns from up to 30 files, Team from 100. Team also includes a personal setup: we build your first prospects from the companies you sell to before your reps call." },
  { q: "What is founding pricing?", a: `Until ${FOUNDING.untilLabel}, Starter is $${FOUNDING.price.starter.usd.month} and Team is $${FOUNDING.price.team.usd.month} per seat each month. If you pay yearly, they're $${FOUNDING.price.starter.usd.year} and $${FOUNDING.price.team.usd.year} a month. The plan cards show the yearly price unless you switch the toggle to monthly. You keep the founding price as long as you stay subscribed. It doesn't combine with other discounts.` },
  { q: "Is there a money-back guarantee?", a: "Yes. If a paid plan isn't working for your team, email us within 30 days of your first payment. We'll refund it in full, no questions asked. It covers the first payment on a new subscription." },
  { q: "Which currency will we be charged in?", a: "Euros or US dollars, your choice at checkout. European companies see euro prices by default. Prices exclude VAT. EU companies with a VAT number are reverse-charged." },
  { q: "Is our data used to train models?", a: "No. We only use your transcripts and recordings to build your own team's prospects and scores." },
];

export default async function PricingPage() {
  const [currency, founding] = await Promise.all([viewerCurrency(), foundingOffer()]);
  const starter = PLANS.find((p) => p.id === "starter")!;
  const team = PLANS.find((p) => p.id === "team")!;
  const starterPrice = founding ? founding.price.starter[currency].month : starter.prices![currency].month;
  const teamPrice = founding ? founding.price.team[currency].month : team.prices![currency].month;
  const starterAnnual = founding ? founding.price.starter[currency].year : starter.prices![currency].year;
  const teamAnnual = founding ? founding.price.team[currency].year : team.prices![currency].year;
  return (
    <>
      <JsonLd data={faqLd(FAQ)} />
      <div className="mx-auto w-full max-w-6xl px-6">
        <section className="pt-14 pb-10 text-center md:pt-16 md:pb-12">
          <h1 className="font-display text-5xl text-balance md:text-7xl">Practice on AI before you practice on real leads.</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance">
            Pay per rep. Each seat adds calls to one shared team pool. Try it free first: {TRIAL.calls} calls, {TRIAL.days} days, no card.
          </p>
          {founding && (
            <p className="bg-signal/10 text-signal-ink mx-auto mt-6 inline-block rounded-full px-4 py-1.5 text-sm font-medium">
              Founding price until {founding.untilLabel}: Starter {formatMoney(starterPrice, currency)} and Team {formatMoney(teamPrice, currency)} per seat each month, or {formatMoney(starterAnnual, currency)} and {formatMoney(teamAnnual, currency)} if you pay yearly. You keep this price as long as you stay subscribed.
            </p>
          )}
        </section>
      </div>

      {/* The cards first: a buyer who came for the price sees it without scrolling. The cost anchor and the calculator follow for the one who wants the case. */}
      <div id="plans" className="mx-auto w-full max-w-6xl px-6 pb-11 md:pb-16">
        <PlanGrid marketing currency={currency} founding={founding} />
        <p className="text-muted-foreground mt-6 text-center text-sm">Costs less than one wasted sales call a week.</p>
        <Guarantee className="mx-auto mt-8 max-w-3xl" />
        <p className="text-muted-foreground mx-auto mt-6 max-w-3xl text-center text-sm">Running a team of 3+ SDRs? <CtaLink ctaId="pricing_founding_partner" href="/founding-partners" className="text-foreground underline underline-offset-4">Apply for a founding-partner pilot</CtaLink>: 30 days, set up from your website, no card.</p>
      </div>

      <AnchorStrip price={starterPrice} currency={currency} />
      <PricingCalculator starterPrice={starterPrice} teamPrice={teamPrice} currency={currency} />
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
      <CtaBand title="Start with five free calls." body="Every plan begins as a trial. Upgrade from inside the app when the team is ready." secondary={{ href: "/karen", label: "Not ready? Try one call against Karen" }} link={{ href: `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Extended trial of 100 Dials")}`, label: "Talk to us about an extended trial", ctaId: "pricing_extended_trial" }} />
    </>
  );
}
