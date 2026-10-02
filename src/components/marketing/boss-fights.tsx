import Link from "next/link";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { Button } from "@/components/ui/button";
import { H2 } from "./sections";

/** Full-black fight card. Karen headlines; the other two share the undercard. */
export function BossFights() {
  const [karen, ...others] = BOSS_PERSONAS;
  return (
    <section className="ink-full text-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-20">
        <div>
          <p className="dial text-signal text-xs">BOSS FIGHTS</p>
          <H2>Then there's Karen.</H2>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3 md:grid-rows-2">
          <article className="border-signal/60 flex flex-col rounded-2xl border p-7 md:col-span-2 md:row-span-2 md:p-10">
            <p className="font-display text-4xl leading-[1.05] md:text-6xl">“{karen.objections[0]}”</p>
            <p className="text-background/80 mt-6 max-w-md text-lg leading-snug">Nobody books her. Composure is the win, and the coach scores exactly that.</p>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-10">
              <div>
                <div className="font-display text-3xl">{karen.name}</div>
                <div className="text-background/60 dial mt-1 text-xs">{karen.title.toUpperCase()}, {karen.company.toUpperCase()}</div>
              </div>
              <Button size="lg" variant="signal" asChild><Link href="/karen">Try to survive Karen</Link></Button>
            </div>
          </article>
          {others.map((b) => (
            <article key={b.name} className="flex flex-col rounded-2xl border border-white/15 p-6">
              <p className="font-display text-2xl leading-snug md:text-3xl">“{b.objections[0]}”</p>
              <div className="mt-auto pt-6">
                <div className="font-display text-2xl">{b.name}</div>
                <div className="text-background/60 dial mt-1 text-[11px]">{b.title.toUpperCase()}</div>
              </div>
            </article>
          ))}
        </div>
        <p className="text-background/50 mt-6 text-sm">Three minutes, a work email, a scored report after. No account needed.</p>
      </div>
    </section>
  );
}
