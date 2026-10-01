import type { Metadata } from "next";
import { PlanGrid } from "@/components/billing/plan-grid";
import { SALES_EMAIL, TRIAL } from "@/lib/billing/plans";
import { viewerCurrency } from "@/lib/billing/currency-server";
import { CtaBand } from "@/components/marketing/sections";
import { JsonLd, faqLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple per-seat pricing with a monthly call allowance. Free trial: 10 calls, 14 days, no card, work email required.",
  alternates: { canonical: "/pricing" },
};

const FAQ = [
  { q: "Is there a money-back guarantee?", a: "Yes. If a paid plan isn't working for your team, email us within 30 days of your first payment and we refund it in full, no questions. It covers the first payment on a new subscription." },
  { q: "Can we pay by invoice?", a: `Yes, on annual plans. Email ${SALES_EMAIL} with the plan and seat count and we send a Stripe invoice with 30-day payment terms. Monthly and quarterly plans are card only.` },
  { q: "What counts as a call?", a: "A practice call that connects to the AI prospect. Failed dials and calls under ten seconds are not counted." },
  { q: "What happens when a rep uses their allowance?", a: "Calls keep working and are billed at the overage rate at the end of the month. Managers can cap overage per team." },
  { q: "Do unused calls roll over?", a: "No. Allowances reset monthly. Annual plans are billed up front with a 20% discount." },
  { q: "Which currency will we be charged in?", a: "Euros or US dollars, your choice at checkout. European companies see euro prices by default. Prices exclude VAT; EU companies with a VAT number are reverse-charged." },
  { q: "Can we use our own call recordings?", a: "Yes, on Team and above. Upload transcripts from Gong, Chorus or your dialer and prospects start sounding like your market within minutes." },
  { q: "Is our data used to train models?", a: "No. Your transcripts and recordings are used only to ground your own team's prospects and grading." },
  { q: "Why work email only?", a: "100 Dials is built for teams. The trial creates a workspace for your company domain, so one person can start and invite the rest." },
];

export default async function PricingPage() {
  const currency = await viewerCurrency();
  return (
    <>
      <JsonLd data={faqLd(FAQ)} />
      <div className="mx-auto w-full max-w-6xl px-6 pb-8">
        <section className="py-16 text-center">
          <p className="text-muted-foreground text-xs">Pricing</p>
          <h1 className="font-display mt-3 text-5xl text-balance md:text-6xl">Cheaper than one burned prospect.</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance">
            Per seat, with a monthly call allowance. Start with {TRIAL.calls} free calls over {TRIAL.days} days, no card, work email required.
          </p>
        </section>

        <PlanGrid marketing currency={currency} />

        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="font-display text-3xl">Questions</h2>
          <dl className="mt-6 divide-y">
            {FAQ.map((f) => (
              <div key={f.q} className="grid gap-2 py-5 md:grid-cols-[1fr_1.6fr]">
                <dt className="font-medium">{f.q}</dt>
                <dd className="text-muted-foreground text-sm">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <CtaBand title="Start with ten free calls." body="Every plan begins as a trial. Upgrade from inside the app when the team is ready." />
    </>
  );
}
