import Link from "next/link";
import { H2, Section } from "@/components/marketing/sections";
import { BenchmarkSources } from "@/components/pricing/anchor-strip";
import { PLANS } from "@/lib/billing/plans";

/**
 * The positioning, right under the hero: what practicing on real leads costs, against the price. A shorter version of
 * the cost block on /pricing, with the same numbers and the same sources line. `price` is today's Starter seat price.
 */
export function CostOfPractice({ price }: { price: string }) {
  const starterCalls = PLANS.find((p) => p.id === "starter")?.callsPerSeat ?? 40;
  const tiles = [
    { big: "~$100", caption: "what one real conversation costs" },
    { big: "30–50", caption: "real conversations a new rep burns while learning" },
    { big: price, caption: `a month for ${starterCalls} practice calls` },
  ];
  return (
    <Section className="border-t">
      <H2 className="max-w-4xl">Practicing on real leads is the most expensive training there is.</H2>
      <div className="text-muted-foreground text-body mt-5 max-w-2xl space-y-3">
        <p>A live conversation with a prospect costs about $100 to get, in rep salary, data and tools. A new rep wastes 30 to 50 of them in the first month while they learn. Mess up the opener with a VP, and that account can be gone for months.</p>
        <p>100 Dials costs {price} a rep per month. Reps make their bad calls on AI prospects, then pick up the phone ready.</p>
      </div>
      <ul className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.caption} className="border-t pt-5">
            <div className="font-display text-6xl leading-none md:text-7xl">{t.big}</div>
            <p className="text-muted-foreground mt-3 text-sm">{t.caption}</p>
          </li>
        ))}
      </ul>
      <Link href="/pricing#calculator" className="mt-8 inline-block font-medium underline-offset-4 hover:underline">See the math for your team →</Link>
      <BenchmarkSources className="mt-6 max-w-3xl" />
    </Section>
  );
}
