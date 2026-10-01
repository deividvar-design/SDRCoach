import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { OBJECTIONS, type ObjectionKind } from "@/lib/scoring/rubric";

export interface ObjectionPageMeta {
  slug: string;
  kind: ObjectionKind;
  /** The rubric's short label, e.g. "Send me an email". */
  label: string;
  /** The rubric's one-line coaching position. */
  coaching: string;
  title: string;
  description: string;
  phrasings: string[];
  related: string[];
  updated: string;
  faq: { q: string; a: string }[];
}

export interface ObjectionPage extends ObjectionPageMeta {
  content: string;
}

const DIR = path.join(process.cwd(), "content", "objections");

function read(slug: string): ObjectionPage | null {
  const file = path.join(DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const kind = String(data.kind) as ObjectionKind;
  const rubric = OBJECTIONS[kind];
  if (!rubric) return null;
  return {
    slug,
    kind,
    label: rubric.label,
    coaching: rubric.coaching,
    title: String(data.title ?? rubric.label),
    description: String(data.description ?? ""),
    phrasings: Array.isArray(data.phrasings) ? data.phrasings.map(String) : [],
    related: Array.isArray(data.related) ? data.related.map(String) : [],
    updated: String(data.updated ?? "2026-10-01"),
    faq: Array.isArray(data.faq) ? data.faq.filter((f: unknown): f is { q: string; a: string } => !!f && typeof f === "object" && "q" in f && "a" in f).map((f) => ({ q: String(f.q), a: String(f.a) })) : [],
    content,
  };
}

/** Every objection page, in the rubric's order so the index reads like the taxonomy. */
export function getAllObjectionPages(): ObjectionPageMeta[] {
  if (!fs.existsSync(DIR)) return [];
  const order = Object.keys(OBJECTIONS);
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => read(f.replace(/\.mdx$/, "")))
    .filter((p): p is ObjectionPage => !!p)
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .map((p) => ({ ...p, content: undefined }) as unknown as ObjectionPageMeta);
}

export function getObjectionPage(slug: string): ObjectionPage | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return read(slug);
}

export function relatedObjections(page: ObjectionPageMeta, n = 3): ObjectionPageMeta[] {
  const all = getAllObjectionPages();
  const picked = page.related.map((s) => all.find((p) => p.slug === s)).filter((p): p is ObjectionPageMeta => !!p && p.slug !== page.slug);
  for (const p of all) {
    if (picked.length >= n) break;
    if (p.slug !== page.slug && !picked.includes(p)) picked.push(p);
  }
  return picked.slice(0, n);
}
