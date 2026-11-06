import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { Eyebrow, H2, Section } from "@/components/marketing/sections";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { AFFILIATE, AFFILIATE_RULES } from "@/content/affiliates";
import { PLANS } from "@/lib/billing/plans";
import { SITE } from "@/lib/site";
import { JoinForm } from "./join-form";

export const metadata = pageMetadata({
  title: `Affiliate programme: ${AFFILIATE.sharePercent}% for ${AFFILIATE.earningMonths} months`,
  description: `Share a link to 100 Dials and earn ${AFFILIATE.sharePercent}% of what every team you refer pays in its first ${AFFILIATE.earningMonths} months. Quarterly payouts, a ${AFFILIATE.cookieDays}-day cookie, no dashboard to babysit.`,
  path: "/affiliates",
  card: ["page", "affiliates"],
});

const starter = PLANS.find((p) => p.id === "starter");
const EXAMPLE_SEATS = 3;
const exampleMonthly = starter?.prices ? starter.prices.usd.month * EXAMPLE_SEATS : 0;
const exampleShare = Math.round((exampleMonthly * AFFILIATE.sharePercent) / 100);

const STEPS: [string, string][] = [
  ["Get your link", "Name, email, where you'll share it, how to pay you. The link appears on the page and in your inbox."],
  ["Share it", `A sales manager opens it and starts a workspace within ${AFFILIATE.cookieDays} days. That team is yours. You get one email when they sign up and one when they first pay.`],
  ["Get paid", `${AFFILIATE.sharePercent}% of what they pay for ${AFFILIATE.earningMonths} months. Statements on the first Monday of each quarter, paid within ${AFFILIATE.payoutWithinDays} days.`],
];

const FAQ: [string, string][] = [
  ["How much is that, in money?", `A three-seat Starter team pays $${exampleMonthly} a month, so you earn about $${exampleShare} a month from it for a year. One team like that clears the $${AFFILIATE.minimumPayout} floor inside a quarter.`],
  ["When does a payment count?", `Once the team's ${AFFILIATE.guaranteeDays}-day money-back window has passed. A payment made in late December shows on the April statement, not the January one. Refunds and chargebacks come off the next statement.`],
  ["Is there a dashboard?", "No. You get an email when a team signs up through your link, another when it first pays, and a statement every quarter. Reply to any of them if you have a question."],
  ["What is the minimum payout?", `$${AFFILIATE.minimumPayout}, or €${AFFILIATE.minimumPayout} for teams that pay in euros. Anything under that carries over to the next quarter and never expires.`],
  ["How is it paid?", `PayPal or SEPA bank transfer, within ${AFFILIATE.payoutWithinDays} days of the statement. If you run a company, invoice ${SITE.company.legalName} for the statement amount; individuals are paid against the statement.`],
  ["Can an existing customer be an affiliate?", "Customers have their own referral programme in the app, which pays in free months and calls. The affiliate programme is for people who don't use the product themselves."],
];

export default function AffiliatesPage() {
  return (
    <>
      <JsonLd data={faqLd(FAQ.map(([q, a]) => ({ q, a })))} />
      <Section className="pt-14 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>Affiliate programme</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Send sales teams our way. Keep {AFFILIATE.sharePercent}% of what they pay for a year.</h1>
          <p className="text-muted-foreground mt-6 text-lg text-balance">
            100 Dials is cold-call practice for SDR teams: AI prospects built from their own accounts, every call scored. If you write for, train or sell to sales managers, you already talk to the people who need it.
          </p>
          <p className="mt-6 text-lg"><Link href="#join" className="underline underline-offset-4">Get your link below</Link></p>
        </div>
      </Section>

      <Section className="border-t">
        <H2>Three steps.</H2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <div className="text-muted-foreground font-mono text-sm tabular">{i + 1}</div>
              <div className="mt-2 font-medium">{title}</div>
              <p className="text-muted-foreground mt-1 text-sm">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="border-t">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card rounded-2xl border p-6 md:p-8">
            <h2 className="font-display text-3xl">The terms</h2>
            <ul className="mt-5 space-y-3">
              {[
                `${AFFILIATE.sharePercent}% of net payments: what the team pays after VAT, refunds and chargebacks.`,
                `For ${AFFILIATE.earningMonths} months from the referred team's first payment.`,
                `A ${AFFILIATE.cookieDays}-day cookie. First click wins.`,
                `Statement on the first Monday of each quarter, paid within ${AFFILIATE.payoutWithinDays} days. Minimum $${AFFILIATE.minimumPayout}; smaller balances carry over.`,
                "We may change or end the programme with 30 days' notice. Earned commission is still paid.",
              ].map((t) => <li key={t} className="flex gap-3"><span className="bg-signal mt-2.5 size-1.5 shrink-0 rounded-full" /><span>{t}</span></li>)}
            </ul>
          </div>
          <div className="bg-card rounded-2xl border p-6 md:p-8">
            <h2 className="font-display text-3xl">The rules</h2>
            <ul className="mt-5 space-y-3">
              {AFFILIATE_RULES.map((t) => <li key={t} className="flex gap-3"><span className="bg-signal mt-2.5 size-1.5 shrink-0 rounded-full" /><span>{t}</span></li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="join" className="border-t">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <H2>Get your link.</H2>
            <p className="text-muted-foreground mt-4">Two minutes. Not sure what to say about us? <Link href="/karen" className="text-foreground underline underline-offset-4">Call Karen</Link> and you will have a story, or send people the <Link href="/sample-report" className="text-foreground underline underline-offset-4">sample report</Link>.</p>
          </div>
          <JoinForm />
        </div>
      </Section>

      <Section className="border-t">
        <H2>Questions.</H2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-2xl border p-6">
              <dt className="font-medium">{q}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
