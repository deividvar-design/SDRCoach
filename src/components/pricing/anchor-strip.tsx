import { Eyebrow } from "@/components/marketing/sections";
import { formatMoney, type Currency } from "@/lib/billing/currency";
import { PLANS } from "@/lib/billing/plans";

/** Published ranges every number on the page sits inside. Re-checked quarterly; they move. */
export const BENCHMARKS = [
  { claim: "SDR fully loaded cost about $8,000 a month", range: "$85k to $130k a year with base, OTE, benefits, tools and management", source: { label: "Stealth Agents, cost of hiring an SDR 2026", href: "https://stealthagents.com/research/cost-of-hiring-a-sales-development-representative-2026" } },
  { claim: "60 dials per rep per day", range: "50 to 80 median for B2B outbound SDRs", source: { label: "Skipcall, cold calls per day", href: "https://skipcall.io/en/blog/how-many-cold-calls-per-day" } },
  { claim: "Connect rate about 7%", range: "5 to 8% on generic data; Gong's 300M-call analysis puts it at 5.4%", source: { label: "Prospeo, connect rate benchmarks", href: "https://prospeo.io/s/connect-rate" } },
  { claim: "Cost per conversation $50 to 100", range: "Derived: $6.85 per dial at a 7% connect rate. Cross-check: outbound cost per booked meeting $185 to 340 at two or three conversations per meeting", source: { label: "The Starr Conspiracy citing Belkins 2024", href: "https://www.thestarrconspiracy.com/insights/benchmarks/b2b-lead-generation-cost-benchmarks-2024" } },
];

/**
 * The cost anchor, directly above the price cards where the buyer is already doing maths. It reframes "$49 against an
 * Apollo seat" as "$49 against the conversations a new rep wrecks in week one". Every figure is the buyer's own cost
 * structure, which they can verify; nothing here is a claim about 100 Dials results.
 */
export function AnchorStrip({ price, currency }: { price: number; currency: Currency }) {
  const starterCalls = PLANS.find((p) => p.id === "starter")?.callsPerSeat ?? 40;
  const money = formatMoney(price, currency);
  const tiles = [
    { big: "~$100", caption: "What one live conversation costs in rep time, data and tools" },
    { big: "30–50", caption: "Live conversations a new rep burns in their first month, before they can run an opener" },
    { big: money, caption: `Per seat per month. ${starterCalls} practice calls a month. Make the mistakes here, not on your pipeline.` },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-11 md:py-16" aria-labelledby="anchor-heading">
      <Eyebrow>What practising on real prospects costs</Eyebrow>
      <h2 id="anchor-heading" className="font-display mt-3 text-4xl leading-[1.05] text-balance md:text-5xl">Every live conversation costs you about $100 to earn.</h2>
      <p className="text-muted-foreground mt-3 max-w-2xl text-lg">A new SDR burns 30 to 50 of them learning on real prospects. 100 Dials is {money}.</p>
      <ul className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.caption} className="border-t pt-5">
            <div className="font-display text-6xl leading-none md:text-7xl">{t.big}</div>
            <p className="text-muted-foreground mt-3 text-sm">{t.caption}</p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-8 max-w-3xl text-sm leading-relaxed">
        An SDR costs roughly $8,000 a month fully loaded and makes about 60 dials a day. Fewer than one dial in ten reaches a real person, so each conversation carries $50 to 100 of salary, data and tooling before anyone says hello. When a rep fumbles the opener with a VP, that account is usually off the table for months. Practising on real prospects is the most expensive training programme you will ever run.
      </p>
      <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
        Sources: {BENCHMARKS.map((b, i) => (
          <span key={b.source.href}>
            {i > 0 && " · "}
            <a href={b.source.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{b.source.label}</a>
          </span>
        ))}. The 40% mishandled share in the calculator is our assumption, not a published figure. Benchmarks as of November 2026.
      </p>
    </section>
  );
}
