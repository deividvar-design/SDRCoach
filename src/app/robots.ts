import type { MetadataRoute } from "next";
import { INDEXABLE, absoluteUrl } from "@/lib/site";

const APP_PATHS = ["/api/", "/admin", "/dashboard", "/targets", "/sessions", "/team", "/knowledge", "/settings", "/practice", "/upgrade", "/onboarding", "/invite/", "/auth/", "/login", "/signup", "/forgot-password", "/reset-password"];

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: APP_PATHS }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
