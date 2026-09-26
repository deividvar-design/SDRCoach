import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Blog posts are read from disk at request/build time; make sure they ship with the server bundle.
  outputFileTracingIncludes: { "/blog/[slug]": ["./content/blog/**/*"], "/blog": ["./content/blog/**/*"], "/sitemap.xml": ["./content/blog/**/*"], "/blog/rss.xml": ["./content/blog/**/*"] },
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
