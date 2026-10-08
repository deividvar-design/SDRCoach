import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getAllObjectionPages, getObjectionPage, relatedObjections } from "@/lib/objections";
import { formatDate } from "@/lib/utils";
import { CtaBand } from "@/components/marketing/sections";
import { JsonLd, articleLd, breadcrumbLd, faqLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllObjectionPages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/objections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = getObjectionPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/objections/${page.slug}` },
    openGraph: { type: "article", url: `/objections/${page.slug}`, modifiedTime: page.updated, tags: ["objection handling", page.label] },
  };
}

const components = {
  Practise: ({ children }: { children: React.ReactNode }) => (
    <aside className="bg-card not-prose my-8 rounded-2xl border p-6">
      <div className="text-muted-foreground text-xs">Practise this</div>
      <div className="mt-2 text-sm">{children}</div>
      <Button size="sm" className="mt-4" asChild><Link href="/signup">Dial it against an AI prospect</Link></Button>
    </aside>
  ),
};

export default async function ObjectionPage({ params }: PageProps<"/objections/[slug]">) {
  const { slug } = await params;
  const page = getObjectionPage(slug);
  if (!page) notFound();
  const { content } = await compileMDX({ source: page.content, components, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
  const related = relatedObjections(page);

  return (
    <>
      <JsonLd
        data={[
          articleLd({ title: page.title, description: page.description, slug: page.slug, path: `/objections/${page.slug}`, date: page.updated, updated: page.updated, author: "100 Dials" }),
          breadcrumbLd([{ name: "Objections", path: "/objections" }, { name: page.label, path: `/objections/${page.slug}` }]),
          ...(page.faq.length ? [faqLd(page.faq)] : []),
        ]}
      />
      <article className="mx-auto w-full max-w-3xl px-6 py-16">
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm"><Link href="/objections" className="hover:underline">Objection library</Link></nav>
        <h1 className="font-display mt-4 text-5xl text-balance">{page.title}</h1>
        <p className="text-muted-foreground mt-4 text-lg">{page.description}</p>
        {page.phrasings.length > 0 && (
          <div className="mt-8">
            <div className="text-muted-foreground text-xs">How it sounds</div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {page.phrasings.map((p) => <li key={p} className="bg-card rounded-full border px-3 py-1 text-sm">“{p}”</li>)}
            </ul>
          </div>
        )}
        <div className="prose mt-10">{content}</div>
        {page.faq.length > 0 && (
          <section className="mt-12 border-t pt-8">
            <h2 className="font-display text-2xl">Questions people ask</h2>
            <dl className="mt-6 space-y-6">
              {page.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-medium">{f.q}</dt>
                  <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <p className="text-muted-foreground mt-10 text-xs">Updated {formatDate(page.updated)}. The position on this page is the one our coach scores against.</p>
      </article>

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-6 pb-8">
          <h2 className="text-muted-foreground text-xs">Objections that travel together</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/objections/${p.slug}`} className="bg-card block h-full rounded-2xl border p-4 hover:shadow-md">
                  <div className="font-display text-2xl leading-tight">“{p.phrasings[0] ?? p.label}”</div>
                  <div className="text-muted-foreground mt-2 text-xs">{p.label}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CtaBand title="Practise it before it counts." body="An AI prospect that raises this objection, and a coach that tells you how you handled it. Ten free calls, work email only." />
    </>
  );
}
