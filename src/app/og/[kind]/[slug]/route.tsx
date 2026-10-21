import { NextResponse } from "next/server";
import { ogCard } from "@/lib/og";
import { PAGE_CARDS, type OgCardSpec } from "@/lib/og-cards";
import { getPost } from "@/lib/blog";
import { getObjectionPage } from "@/lib/objections";

/**
 * Share cards at stable URLs, one per page, post and objection, so metadata and structured data can point at them
 * without the per-build hash that file-based images carry. Unknown slugs are 404s, so nobody can mint cards.
 */
function resolve(kind: string, slug: string): OgCardSpec | null {
  if (kind === "page") return PAGE_CARDS[slug] ?? null;
  if (kind === "blog") {
    const post = getPost(slug);
    return post ? { title: post.title, kicker: "From the 100 Dials blog", footer: `${post.readingMinutes} min read` } : null;
  }
  if (kind === "objections") {
    const page = getObjectionPage(slug);
    return page ? { title: page.title, kicker: "Objection library", footer: "What it means, three answers, the mistakes that lose the call" } : null;
  }
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  const card = resolve(kind, slug);
  if (!card) return new NextResponse("Not found", { status: 404 });
  const response = ogCard(card);
  response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return response;
}
