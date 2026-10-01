import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getAllObjectionPages } from "@/lib/objections";
import { SITE, absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date(SITE.contentUpdated);
  const legal = new Date(SITE.legalUpdated);
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/for-managers"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/for-enablement"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/objections"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/trust"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/privacy"), lastModified: legal, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: legal, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/cookies"), lastModified: legal, changeFrequency: "yearly", priority: 0.1 },
  ];
  const posts: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const objections: MetadataRoute.Sitemap = getAllObjectionPages().map((p) => ({
    url: absoluteUrl(`/objections/${p.slug}`),
    lastModified: new Date(p.updated),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...pages, ...objections, ...posts];
}
