import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author: string;
  tags: string[];
  readingMinutes: number;
  draft: boolean;
}

export interface Post extends PostMeta {
  content: string;
}

const DIR = path.join(process.cwd(), "content", "blog");

function read(slug: string): Post | null {
  const file = path.join(DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: String(data.date ?? "1970-01-01"),
    updated: data.updated ? String(data.updated) : undefined,
    author: String(data.author ?? "100 Dials"),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
    draft: Boolean(data.draft),
    content,
  };
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => read(f.replace(/\.mdx$/, "")))
    .filter((p): p is Post => !!p && (!p.draft || process.env.NODE_ENV !== "production"))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({ ...p, content: undefined }) as unknown as PostMeta);
}

export function getPost(slug: string): Post | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const p = read(slug);
  if (!p || (p.draft && process.env.NODE_ENV === "production")) return null;
  return p;
}

export function relatedPosts(slug: string, tags: string[], n = 3): PostMeta[] {
  return getAllPosts()
    .filter((p) => p.slug !== slug)
    .map((p) => ({ p, score: p.tags.filter((t) => tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.p);
}
