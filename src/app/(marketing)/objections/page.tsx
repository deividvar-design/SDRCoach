import type { Metadata } from "next";
import Link from "next/link";
import { getAllObjectionPages } from "@/lib/objections";
import { CtaBand, Eyebrow, Section } from "@/components/marketing/sections";
import { JsonLd, breadcrumbLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Cold call objections: what to say to each one",
  description: "Fifteen cold-call objections, from 'send me an email' to 'we're not a fit', each with what it really means, three ways to handle it, a worked exchange and the mistakes that lose the call.",
  alternates: { canonical: "/objections" },
};

export default function ObjectionIndex() {
  const pages = getAllObjectionPages();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Objections", path: "/objections" }])} />
      <Section className="pt-14 md:pt-20">
        <Eyebrow>Objection library</Eyebrow>
        <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Every cold-call objection, and what to say back.</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
          The same {pages.length} objections our coach tags on every scored call. Each page has what the line really means, three ways to handle it, an exchange that works, and the mistakes that lose the call.
        </p>
      </Section>

      <Section className="pt-0 md:pt-0">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link href={`/objections/${p.slug}`} className="bg-card group flex h-full flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg">
                <div className="text-muted-foreground text-xs">Prospect says</div>
                <h2 className="font-display mt-2 text-2xl leading-tight group-hover:underline underline-offset-4">“{p.phrasings[0] ?? p.label}”</h2>
                <p className="text-muted-foreground mt-3 flex-1 text-sm">{p.coaching}</p>
                <div className="mt-4 text-xs font-medium">How to handle {p.label.toLowerCase()}</div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Hear them said out loud." body="An AI prospect raises these on every practice call and the coach tags how you handled each one. Ten calls are free." />
    </>
  );
}
