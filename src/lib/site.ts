/** The public origin: the configured app URL, else this deployment's own host on Vercel, else localhost. */
export function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Single source of truth for site-wide identity. */
export const SITE = {
  name: "100 Dials",
  /** The one-line descriptor that sits under the name wherever the name stands alone. */
  descriptor: "Cold Call Coach",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "https://100dials.com").replace(/\/$/, ""),
  tagline: "Practice the call before it counts.",
  description: "AI cold-call training for SDR teams. Reps dial realistic AI prospects built from their own targets and get coached on every call.",
  company: {
    // Set NEXT_PUBLIC_LEGAL_NAME / NEXT_PUBLIC_LEGAL_ADDRESS once incorporated; until then the pages name the product only.
    legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "100 Dials",
    address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "",
    country: process.env.NEXT_PUBLIC_LEGAL_COUNTRY ?? "the European Union",
    email: process.env.NEXT_PUBLIC_SALES_EMAIL ?? "hello@100dials.com",
    privacyEmail: "privacy@100dials.com",
    securityEmail: "security@100dials.com",
  },
  legalUpdated: "2026-09-26",
  /** Bumped when marketing pages change materially; the sitemap reports it instead of "now". */
  contentUpdated: "2026-10-05",
} as const;

/**
 * Search engines should only ever index the real domain. While the site lives on a *.vercel.app host
 * every page is noindex and robots.txt disallows everything; attaching the domain flips this by itself.
 */
export const INDEXABLE = !/\.vercel\.app$/.test(new URL(SITE.url).hostname) && !/localhost/.test(SITE.url);

export function absoluteUrl(path = "/") {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
