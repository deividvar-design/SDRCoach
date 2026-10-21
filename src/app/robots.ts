import type { MetadataRoute } from "next";
import { INDEXABLE, absoluteUrl } from "@/lib/site";
import { NOINDEX_PATHS } from "@/lib/routes";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: NOINDEX_PATHS }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
