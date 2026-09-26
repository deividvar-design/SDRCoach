import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { formatDate } from "@/lib/utils";
import { CtaBand, Eyebrow, Section } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Blog: cold calling, backed by data",
  description: "Research-backed guides on cold-call openers, objection handling, talk ratio and SDR coaching. Short, specific, and practisable.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const [first, ...rest] = posts;
  return (
    <>
      <Section className="pt-14 md:pt-20">
        <Eyebrow>Blog</Eyebrow>
        <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Cold calling, with the data attached.</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">Short guides on what actually books meetings, written for reps and the people who coach them. Every post ends with something you can practise today.</p>
      </Section>

      {first && (
        <Section className="border-t pt-0 md:pt-0">
          <Link href={`/blog/${first.slug}`} className="bg-card group grid gap-6 rounded-3xl border p-8 md:grid-cols-[1fr_1.4fr] md:p-12">
            <div>
              <div className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">Latest · {formatDate(first.date)} · {first.readingMinutes} min</div>
              <h2 className="font-display mt-3 text-4xl group-hover:underline underline-offset-4">{first.title}</h2>
            </div>
            <p className="text-muted-foreground self-center text-lg">{first.description}</p>
          </Link>
        </Section>
      )}

      <Section className="pt-0 md:pt-0">
        <ul className="grid gap-6 md:grid-cols-3">
          {rest.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="bg-card group flex h-full flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg">
                <div className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">{formatDate(p.date)} · {p.readingMinutes} min</div>
                <h2 className="font-display mt-3 text-2xl group-hover:underline underline-offset-4">{p.title}</h2>
                <p className="text-muted-foreground mt-2 flex-1 text-sm">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => <span key={t} className="rounded-full border px-2 py-0.5 text-[11px]">{t}</span>)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Read it, then dial it." body="Every technique here works better after ten practice calls. Ten are free." />
    </>
  );
}
