import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getAllPosts, getPost, relatedPosts } from "@/lib/blog";
import { formatDate } from "@/lib/utils";
import { CtaBand } from "@/components/marketing/sections";
import { JsonLd, articleLd, breadcrumbLd, faqLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", publishedTime: post.date, modifiedTime: post.updated ?? post.date, authors: [post.author], tags: post.tags },
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

export default async function BlogPost({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { content } = await compileMDX({ source: post.content, components, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
  const related = relatedPosts(post.slug, post.tags);

  return (
    <>
      <JsonLd data={[articleLd(post), breadcrumbLd([{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }]), ...(post.faq.length ? [faqLd(post.faq)] : [])]} />
      <article className="mx-auto w-full max-w-3xl px-6 py-16">
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm"><Link href="/blog" className="hover:underline">Blog</Link></nav>
        <h1 className="font-display mt-4 text-5xl text-balance">{post.title}</h1>
        <p className="text-muted-foreground mt-4 text-lg">{post.description}</p>
        <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>{post.author}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <div className="prose mt-10">{content}</div>
        {post.faq.length > 0 && (
          <section className="mt-12 border-t pt-8">
            <h2 className="font-display text-2xl">Questions people ask</h2>
            <dl className="mt-6 space-y-6">
              {post.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-medium">{f.q}</dt>
                  <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <div className="mt-10 flex flex-wrap gap-1.5">
          {post.tags.map((t) => <span key={t} className="rounded-full border px-2.5 py-0.5 text-xs">{t}</span>)}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-6 pb-8">
          <h2 className="text-muted-foreground text-xs">Keep reading</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="bg-card block h-full rounded-2xl border p-4 hover:shadow-md">
                  <div className="font-display text-2xl leading-tight">{p.title}</div>
                  <div className="text-muted-foreground mt-2 text-xs">{p.readingMinutes} min</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CtaBand title="Practise it before it counts." body="Ten free calls against a prospect that pushes back. Work email only." />
    </>
  );
}
