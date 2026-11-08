import Link from "next/link";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { Button } from "@/components/ui/button";
import { COUNTER_MIN } from "@/lib/demo/share-constants";
import { H2 } from "./sections";

/** Full-black fight card. Karen headlines; the other two share the undercard. */
/** How a persona's title reads on the card, where it differs from the title the prospect uses on the call. */
const CARD_TITLE: Record<string, string> = { "Jax Rivera": "Founder, creator-economy startup" };
/** `hangUps` is this month's real count; the line only renders once it clears the threshold. */
export function BossFights({ hangUps = 0 }: { hangUps?: number }) {
  const [karen, ...others] = BOSS_PERSONAS;
  return (
    <section className="ink-full text-paper">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <H2>Then there's Karen.</H2>
          </div>
          {hangUps >= COUNTER_MIN && <p className="dial text-paper/70 text-sm">KAREN HAS HUNG UP ON {hangUps.toLocaleString("en-GB")} REPS THIS MONTH</p>}
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3 md:grid-rows-2">
          <article className="border-signal/60 flex flex-col rounded-2xl border p-7 md:col-span-2 md:row-span-2 md:p-10">
            <p className="font-display text-4xl leading-[1.05] md:text-6xl">“{karen.objections[0]}”</p>
            <p className="text-paper/80 mt-6 max-w-md text-lg leading-snug">Nobody has booked a meeting with her yet. Staying calm is the win, and that's what the coach scores.</p>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-10">
              <div>
                <div className="font-display text-3xl">{karen.name}</div>
                <div className="text-paper/60 mt-1 text-sm">{karen.title}, {karen.company}</div>
              </div>
              <Button size="lg" variant="signal" asChild><Link href="/karen">Try to survive Karen</Link></Button>
            </div>
          </article>
          {others.map((b) => (
            <article key={b.name} className="flex flex-col rounded-2xl border border-white/15 p-6">
              <p className="dial text-paper/50 mb-4 text-[11px]">BOSS FIGHT · AI PROSPECT</p>
              <p className="font-display text-2xl leading-snug md:text-3xl">“{b.objections[0]}”</p>
              <div className="mt-auto pt-6">
                <div className="font-display text-2xl">{b.name}</div>
                <div className="text-paper/60 mt-1 text-sm">{CARD_TITLE[b.name] ?? b.title}</div>
              </div>
            </article>
          ))}
        </div>
        <p className="text-paper/60 mt-6">Three minutes. No account. Leave an email after the call to get your score.</p>
      </div>
    </section>
  );
}
