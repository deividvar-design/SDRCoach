import Link from "next/link";
import { getAllObjectionPages } from "@/lib/objections";

/** The lines prospects actually say, drifting across the page. Each one is a door into the objection library. */
export function ObjectionTicker() {
  const items = getAllObjectionPages().map((p) => ({ slug: p.slug, line: p.phrasings[0] ?? p.label }));
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="ticker group relative overflow-hidden border-y py-5" aria-label="Objections prospects raise">
      <div className="ticker-track flex w-max gap-10 whitespace-nowrap">
        {row.map((it, i) => (
          <Link key={`${it.slug}-${i}`} href={`/objections/${it.slug}`} className="font-display text-muted-foreground hover:text-foreground text-2xl transition-colors md:text-3xl" aria-hidden={i >= items.length}>
            “{it.line}”
          </Link>
        ))}
      </div>
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r to-transparent" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l to-transparent" />
    </div>
  );
}
