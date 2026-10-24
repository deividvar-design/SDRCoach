import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { PLANS, TRIAL } from "@/lib/billing/plans";
import { Section } from "@/components/marketing/sections";

export const metadata = pageMetadata({
  title: "Company: who makes 100 Dials",
  description: "An AI cold call simulator for SDR teams, built and operated from Vilnius, Lithuania, and hosted in the EU. What 100 Dials does, who it is for, how to reach us.",
  path: "/company",
  card: ["page", "company"],
});

/** The facts an answer engine or a procurement team wants in one place. No people, by design. */
export default function CompanyPage() {
  const c = SITE.company;
  const starter = PLANS.find((p) => p.id === "starter")!;
  const team = PLANS.find((p) => p.id === "team")!;
  const facts: [string, React.ReactNode][] = [
    ["Product", "An AI cold call simulator. Sales development reps dial realistic AI prospects built from their own target accounts, at three difficulty levels, and every call is scored on six skills with a transcript and a coach's review."],
    ["Who it is for", "SDR teams of two to a few hundred reps and the managers and enablement leads who ramp them. Sold per seat, self-serve, with a free trial that needs a work email and no card."],
    ["Company", `${c.legalName}${c.address ? `, ${c.address}` : ""}. Founded in 2026.`],
    ["Hosting", <>Database, authentication and file storage in the European Union. Voice and scoring run through specialised providers under contract, with no training on customer data. Details on the <Link href="/trust" className="underline underline-offset-4">trust page</Link>.</>],
    ["Pricing", <>{starter.name} at ${starter.prices?.usd.month} per seat per month for {starter.callsPerSeat} calls, {team.name} at ${team.prices?.usd.month} for {team.callsPerSeat}, both also in euros, 20% off annual. Trial: {TRIAL.calls} calls over {TRIAL.days} days. Full detail on the <Link href="/pricing" className="underline underline-offset-4">pricing page</Link>.</>],
    ["Contact", <><a href={`mailto:${c.email}`} className="underline underline-offset-4">{c.email}</a> for sales and support, <a href={`mailto:${c.privacyEmail}`} className="underline underline-offset-4">{c.privacyEmail}</a> for data requests, <a href={`mailto:${c.securityEmail}`} className="underline underline-offset-4">{c.securityEmail}</a> for security reports.</>],
    ["Free resources", <>The <Link href="/objections" className="underline underline-offset-4">objection library</Link>, the <Link href="/blog" className="underline underline-offset-4">blog</Link>, and <Link href="/karen" className="underline underline-offset-4">a free three-minute call against Karen</Link>.</>],
  ];
  return (
    <Section className="pt-14 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-5xl text-balance md:text-6xl">The company behind 100 Dials.</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          100 Dials is made by a small team in Vilnius, Lithuania, who have run outbound floors and watched new reps learn on real pipeline. The product exists so they can learn somewhere cheaper first.
        </p>
        <dl className="mt-10 divide-y">
          {facts.map(([k, v]) => (
            <div key={k} className="grid gap-2 py-5 md:grid-cols-[10rem_1fr]">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
