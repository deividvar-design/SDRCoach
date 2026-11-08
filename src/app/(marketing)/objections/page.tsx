import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Fragment } from "react";
import { getAllObjectionPages } from "@/lib/objections";
import { CtaBand, Eyebrow, Section } from "@/components/marketing/sections";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { CtaLink } from "@/components/analytics/cta-link";

const FAQ = [
  { q: "What are the most common cold call objections?", a: "The ones reps hear most are not interested, send me an email, I don't have time, we already have a solution, no budget, call me back later, I'm not the decision maker and too expensive. Most of them are reflexes to being cold called rather than decisions about the product, which is why the answer to each starts with one question rather than a defence." },
  { q: "How do you handle an objection on a cold call?", a: "Acknowledge it in a few words, ask one question about the problem the product deals with, and let the answer decide whether the call continues. Defending the product, agreeing to send an email, or arguing with the objection all end the call. Each page in this library gives three ways to handle the line and the mistakes that lose it." },
  { q: "Does not interested mean the call is over?", a: "Usually not. The prospect has not heard enough to be uninterested in anything specific, so it is a reflex. Ask how they handle the problem today. If there is a real problem you have a conversation, and if not, thank them and end the call on your terms." },
];

export const metadata = pageMetadata({
  title: "Cold call objections: what to say to each one",
  description: "Fifteen cold-call objections, from 'send me an email' to 'we're not a fit': what each means, three ways to handle it, and the mistakes that lose the call.",
  path: "/objections",
  card: ["page", "objections"],
});

export default function ObjectionIndex() {
  const pages = getAllObjectionPages();
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Objections", path: "/objections" }]), faqLd(FAQ)]} />
      <Section className="pt-14 md:pt-20">
        <Eyebrow>Objection library</Eyebrow>
        <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Every cold-call objection, and what to say back.</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
          The same {pages.length} objections our coach tags on every scored call. Each page has what the line really means, three ways to handle it, an exchange that works, and the mistakes that lose the call.
        </p>
      </Section>

      <Section className="pt-0 md:pt-0">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p, i) => (
            <Fragment key={p.slug}>
              <li className="bg-card flex h-full flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg">
                <div className="text-muted-foreground text-xs">Prospect says</div>
                <h2 className="font-display mt-2 text-2xl leading-tight"><Link href={`/objections/${p.slug}`} className="hover:underline underline-offset-4">“{p.phrasings[0] ?? p.label}”</Link></h2>
                <p className="text-muted-foreground mt-3 flex-1 text-sm">{p.coaching}</p>
                <div className="mt-4 flex flex-col gap-1.5 text-xs font-medium">
                  <Link href={`/objections/${p.slug}`} className="hover:underline underline-offset-4">How to handle {p.label.toLowerCase()}</Link>
                  <CtaLink ctaId="objections_card_karen" href={`/karen?objection=${p.slug}&from=/objections`} className="text-signal-ink hover:underline underline-offset-4">Hear it said to you →</CtaLink>
                </div>
              </li>
              {i === 4 && (
                <li className="stage text-paper rounded-3xl px-8 py-10 text-center sm:col-span-2 md:px-12 lg:col-span-3">
                  <h2 className="font-display text-4xl text-balance md:text-5xl">These are easier to read than to answer.</h2>
                  <p className="mx-auto mt-3 max-w-md text-balance opacity-80">Karen will throw three of them at you in a 3-minute call. No account, no card.</p>
                  <Button size="lg" variant="signal" className="mt-6" asChild><CtaLink ctaId="objections_mid_karen" href="/karen?from=/objections">Call Karen now</CtaLink></Button>
                  <p className="mt-3 text-xs opacity-70">takes 3 minutes</p>
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      </Section>

      <Section className="border-t">
        <h2 className="font-display text-4xl text-balance md:text-5xl">The questions behind the library.</h2>
        <dl className="mt-8 divide-y">
          {FAQ.map((f) => (
            <div key={f.q} className="grid gap-2 py-5 md:grid-cols-[1fr_1.6fr]">
              <dt className="font-medium">{f.q}</dt>
              <dd className="text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand
        title="Hear them said out loud."
        body="An AI prospect raises these on every ramp call and the coach tags how you handled each one. Ten calls are free."
        primary={{ href: "/karen?from=/objections", label: "Call Karen: 3 min, no signup", ctaId: "objections_bottom_karen" }}
        secondary={null}
        link={{ href: "/signup", label: "Start the 5-call team trial", ctaId: "objections_bottom_trial" }}
      />
    </>
  );
}
