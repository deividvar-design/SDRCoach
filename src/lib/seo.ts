import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/site";
import { ogPath } from "@/lib/og-cards";

/** Past this, the ", 100 Dials" suffix is dropped so the claim survives in the result snippet. */
const SUFFIX_LIMIT = 48;

interface PageMeta {
  title: string;
  description: string;
  /** The canonical path, e.g. "/pricing" or "/blog/<slug>". */
  path: string;
  /** Share card: [kind, slug] for `/og/<kind>/<slug>`. Defaults to the site card. */
  card?: ["page" | "blog" | "objections", string];
  article?: { publishedTime?: string; modifiedTime?: string; authors?: string[]; tags?: string[] };
  noindex?: boolean;
}

/**
 * Every public page's metadata in one place. Next replaces, rather than merges, nested metadata objects, so a page
 * that set only `openGraph.url` lost the inherited image, site name and locale, and one that set only
 * `alternates.canonical` lost the RSS link. This helper writes the whole block each time.
 */
export function pageMetadata(m: PageMeta): Metadata {
  const [kind, slug] = m.card ?? ["page", "default"];
  const image = absoluteUrl(ogPath(kind, slug, SITE.contentUpdated));
  const useTemplate = m.title.length <= SUFFIX_LIMIT;
  const fullTitle = useTemplate ? `${m.title}, ${SITE.name}` : m.title;
  return {
    title: useTemplate ? m.title : { absolute: m.title },
    description: m.description,
    alternates: { canonical: m.path, types: { "application/rss+xml": absoluteUrl("/blog/rss.xml") } },
    openGraph: {
      type: m.article ? "article" : "website",
      siteName: SITE.name,
      locale: "en_US",
      url: m.path,
      title: fullTitle,
      description: m.description,
      images: [{ url: image, width: 1200, height: 630, alt: m.title }],
      ...m.article,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: m.description, images: [image] },
    ...(m.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
