import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

const nextConfig: NextConfig = {
  // Blog posts are read from disk at request/build time; make sure they ship with the server bundle.
  outputFileTracingIncludes: {
    "/": ["./content/objections/**/*"],
    // The Karen pages and the scorecard email name the objection card the caller came from.
    "/karen": ["./content/objections/**/*"],
    "/karen/result": ["./content/objections/**/*"],
    "/api/demo/end": ["./content/objections/**/*"],
    "/api/demo/finalize": ["./content/objections/**/*"],
    "/blog/[slug]": ["./content/blog/**/*"],
    "/blog": ["./content/blog/**/*"],
    "/blog/rss.xml": ["./content/blog/**/*"],
    "/sitemap.xml": ["./content/blog/**/*", "./content/objections/**/*"],
    "/og/[kind]/[slug]": ["./content/blog/**/*", "./content/objections/**/*"],
  },
  images: { formats: ["image/avif", "image/webp"] },
  poweredByHeader: false,
  // PostHog through our own domain: ad blockers drop requests to posthog.com, not to /ingest here.
  async rewrites() {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
    const assets = host.replace(/\/\/(eu|us)\./, "//$1-assets.");
    return [
      { source: "/ingest/static/:path*", destination: `${assets}/static/:path*` },
      { source: "/ingest/:path*", destination: `${host}/:path*` },
    ];
  },
  skipTrailingSlashRedirect: true,
  async redirects() {
    // Feed readers guess these paths; the one feed lives under /blog.
    return [
      { source: "/rss.xml", destination: "/blog/rss.xml", permanent: true },
      { source: "/feed.xml", destination: "/blog/rss.xml", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

// Source maps upload only when a token is present (Vercel); local builds stay untouched.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
