import Link from "next/link";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { Button } from "@/components/ui/button";
import { Eyebrow, H2 } from "./sections";

/** Character sheet traits, 0 to 5. Written as character design, not measurement. */
const TRAITS: Record<string, [string, number][]> = {
  "Karen Whitlock": [["Condescension", 5], ["Patience", 1], ["Respect for process", 5]],
  "Jax Rivera": [["Attention span", 1], ["Self-regard", 5], ["Interest in your pitch", 0]],
  "Victor Steele": [["Tolerance for adjectives", 0], ["Seconds you get", 1], ["Respect for numbers", 5]],
};

export function BossFights() {
  return (
    <section className="stage text-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow className="text-background/60">Then there's Karen</Eyebrow>
            <H2>Boss fights, for when Level 3 stops being scary.</H2>
          </div>
          <p className="text-background/70 max-w-sm text-sm">Deliberately unbearable. Nobody is expected to book them. Staying composed is the win, and the coach scores exactly that.</p>
        </div>
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {BOSS_PERSONAS.map((b) => (
            <li key={b.name} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="text-background/60 text-xs">{b.title}, {b.company}</div>
              <h3 className="font-display mt-1 text-3xl">{b.name}</h3>
              <p className="font-display text-signal mt-5 text-2xl leading-snug">“{b.objections[0]}”</p>
              <dl className="mt-auto space-y-2.5 pt-8">
                {(TRAITS[b.name] ?? []).map(([label, v]) => (
                  <div key={label} className="flex items-center justify-between gap-4 text-xs">
                    <dt className="text-background/70">{label}</dt>
                    <dd className="flex gap-1" aria-label={`${v} of 5`}>
                      {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < v ? "bg-signal h-2 w-4 rounded-sm" : "h-2 w-4 rounded-sm bg-white/15"} />)}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button size="lg" variant="signal" asChild><Link href="/karen">Try to survive Karen, no account needed</Link></Button>
          <p className="text-background/60 text-sm">Three minutes, a work email, a scored report after.</p>
        </div>
      </div>
    </section>
  );
}
