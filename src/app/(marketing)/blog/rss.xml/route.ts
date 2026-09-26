import { getAllPosts } from "@/lib/blog";
import { SITE, absoluteUrl } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const posts = getAllPosts();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(SITE.name)} Blog</title>
<link>${absoluteUrl("/blog")}</link>
<description>${esc("Cold calling, with the data attached.")}</description>
<language>en</language>
<atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml"/>
${posts
  .map(
    (p) => `<item>
<title>${esc(p.title)}</title>
<link>${absoluteUrl(`/blog/${p.slug}`)}</link>
<guid>${absoluteUrl(`/blog/${p.slug}`)}</guid>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
<description>${esc(p.description)}</description>
</item>`,
  )
  .join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
