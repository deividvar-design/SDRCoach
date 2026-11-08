import Link from "next/link";
import { Check, Phone, Plus } from "lucide-react";
import { CtaLink } from "@/components/analytics/cta-link";
import { CookieSettingsLink } from "@/components/analytics/cookie-banner";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { HomeNav } from "@/components/marketing/home-nav";
import { JsonLd, organizationLd, softwareLd } from "@/components/seo/json-ld";
import { cachedSpotsLeft } from "@/lib/partners/spots";
import { bookingUrl } from "@/content/booking";
import { PARTNER } from "@/content/founding-partners";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { SALESFORGE } from "@/content/testimonials";
import { FOUNDING, PLANS, TRIAL } from "@/lib/billing/plans";
import { foundingOffer } from "@/lib/billing/founding";
import { LEVEL_LIST } from "@/lib/domain/levels";
import { KAREN } from "@/lib/demo/boss";
import { getAllObjectionPages } from "@/lib/objections";
import { RUBRIC, RUBRIC_KEYS, type RubricKey } from "@/lib/scoring/rubric";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { callKaren } from "@/app/(marketing)/karen/actions";
import { cn } from "@/lib/utils";

/**
 * The homepage: navy hero with Karen, the product, what practicing on real leads costs, the levels, the objections,
 * the manager view, pricing and questions. Every price, level, objection and quote reads from the same config as
 * the rest of the site.
 */
export const metadata = pageMetadata({
  title: "AI cold call simulator for new SDRs",
  description: `Let new SDRs practice cold calls on AI prospects before they touch real leads. Six-skill score after every call. ${TRIAL.calls} free calls, no card.`,
  path: "/",
});

// Founding prices and partner spots are reads; an hourly rebuild keeps the page cached at the edge.
export const revalidate = 3600;

const FOOTER_COLS = [
  { title: "Product", links: [["/for-managers", "For managers"], ["/for-enablement", "For enablement"], ["/pricing", "Pricing"], ["/founding-partners", "Founding partners"], ["/signup", "Start free trial"]] },
  { title: "Resources", links: [["/blog", "Blog"], ["/objections", "Objection library"], ["/karen", "Fight Karen"], ["/refer", "Refer a team"], ["/affiliates", "Affiliates"], ["/research", "Research"], ["/trust", "Trust & security"]] },
  { title: "Legal", links: [["/company", "Company"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"]] },
] as const;


const FEATURED = ["not-interested", "send-me-an-email", "no-budget", "we-already-have-a-solution", "call-me-back-later", "not-the-decision-maker"];
const FIRST_LINE: Record<string, string> = { warm: "Hi, this is Dana.", inbound: "Dana speaking.", cold: "Yeah?" };
const LEVEL_NOTE: Record<string, string> = {
  warm: "Friendly and curious. Practice the opener, pitch and close with no pressure.",
  inbound: "Filled in a form last week, half remembers why. Pushes back on price and timing.",
  cold: "A busy senior buyer you just interrupted. Tests whether you know your stuff.",
};
const STEPS = ["Add your accounts", "Rep makes the call", "Coach scores it", "Fix one thing, dial again"];
const SCORES: Record<RubricKey, number> = { opener: 7, reason_for_call: 8, discovery: 6, objection_handling: 7, value_prop: 5, close: 6 };
/** Illustrative team, labelled as such on the page. Never customer results. */
const TEAM: [string, number[]][] = [
  ["Sam", [6, 5, 4, 4, 3, 5]],
  ["Priya", [7, 6, 4, 5, 4, 6]],
  ["Tomás", [6, 7, 5, 6, 4, 7]],
  ["Lena", [8, 7, 6, 6, 5, 7]],
  ["Marcus", [8, 8, 7, 7, 6, 8]],
];
const TEAM_HEAD = ["Opener", "Reason", "Discovery", "Objections", "Value", "Close"];

/** Light columns behind the hero and the closing band: fixed so the page renders the same every time. */
const BARS = [
  [2, 5, "s"], [7, 3, "a"], [11, 6, "s"], [17, 4, "s"], [22, 3, "a"], [27, 7, "s"], [34, 4, "s"], [39, 3, "a"], [44, 6, "s"],
  [51, 4, "s"], [56, 5, "s"], [62, 3, "a"], [67, 6, "s"], [73, 4, "s"], [78, 3, "a"], [83, 6, "s"], [89, 4, "s"], [94, 5, "s"],
] as const;

function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {BARS.map(([left, width, tone], i) => (
        <span
          key={i}
          className="hp-bar absolute top-[8%] bottom-0"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            background: tone === "a" ? "linear-gradient(to bottom, transparent, rgba(245,166,91,.55) 55%, rgba(245,166,91,.15))" : "linear-gradient(to bottom, transparent, rgba(150,175,205,.32) 50%, rgba(150,175,205,.1))",
            animationDuration: `${6 + (i % 5) * 1.4}s`,
            animationDelay: `${-((i * 1.7) % 9).toFixed(1)}s`,
          }}
        />
      ))}
    </div>
  );
}

function Wave() {
  // Karen's voice: each bar rises and falls on its own short cycle, louder in the middle of the line.
  const h = [5, 9, 14, 8, 11, 18, 22, 12, 7, 16, 24, 19, 10, 6, 13, 20, 15, 9, 12, 7, 10, 6, 8, 5, 7, 4, 6, 3];
  return (
    <div className="flex h-7 items-center gap-[3px]" aria-hidden>
      {h.map((v, i) => <span key={i} className={cn("hp-vo w-[3px] rounded-full", i < 18 ? "bg-[var(--hp-peach)]" : "bg-white/25")} style={{ height: v, animationDuration: `${0.7 + (i % 5) * 0.15}s`, animationDelay: `${-((i * 0.13) % 1).toFixed(2)}s` }} />)}
    </div>
  );
}

export default async function HomePage() {
  const offer = await foundingOffer().catch(() => null);
  const spots = await cachedSpotsLeft().catch(() => 0);
  const starter = PLANS.find((p) => p.id === "starter")!;
  const team = PLANS.find((p) => p.id === "team")!;
  const enterprise = PLANS.find((p) => p.id === "enterprise")!;
  const price = (id: "starter" | "team", k: "month" | "year") => offer ? FOUNDING.price[id].usd[k] : (PLANS.find((p) => p.id === id)?.prices?.usd[k] ?? 0);
  const objections = getAllObjectionPages().filter((p) => FEATURED.includes(p.slug)).sort((a, b) => FEATURED.indexOf(a.slug) - FEATURED.indexOf(b.slug));
  const [, jax, victor] = BOSS_PERSONAS;
  const book = bookingUrl("home_header");
  const FAQ = [
    ["What do my reps need to start?", `A browser and a microphone. No install, no dialer setup. Pick a prospect, press call, and it rings. Your first call takes under two minutes.`],
    ["Can the prospects sound like our market?", "Yes. Build prospects from the companies on your list, with their problems and objections. Upload call transcripts from Gong, Chorus, Apollo or your dialer, and the prospects learn how your buyers talk."],
    ["How is a call scored?", `The coach scores six skills out of 10: ${RUBRIC_KEYS.map((k) => RUBRIC[k].label.toLowerCase()).join(", ")}. It quotes what the rep said and picks one thing to fix before the next call.`],
    ["What's in the free trial?", `${TRIAL.calls} calls over ${TRIAL.days} days, with no card. Any email works. Scoring and the manager view are included.`],
    ["Does this replace live calling?", "No. It replaces the bad calls new reps make while they learn. They practice the opener and the hard objections here, then call real prospects ready."],
  ];

  return (
    <div className="homepage bg-[var(--hp-cream)] text-[var(--hp-ink)] antialiased">
      <JsonLd data={[organizationLd(), softwareLd()]} />
      {/* "Continue as …" for signed-out visitors: starts the Karen call, like the main button. */}
      <GoogleOneTap mode="karen" next="/karen/start" />

      {/* Partner bar */}
      {(spots ?? 0) > 0 && <CtaLink ctaId="home_partner_bar" href="/founding-partners" className="block bg-[var(--hp-deep)] px-4 py-2 text-center text-[13px] text-white/80 hover:text-white">
        <span className="mr-2 inline-block size-1.5 -translate-y-px rounded-full bg-[var(--hp-peach)]" />
        Founding teams get a free {PARTNER.pilotDays}-day pilot, set up for you from your website. <span className="font-medium text-white underline underline-offset-4">Apply</span>
      </CtaLink>}

      <main id="content">
      {/* Hero, steps and the product, on one dark stage */}
      <div className="relative isolate overflow-hidden bg-[var(--hp-navy)] text-white">
        <Aurora className="-z-10 [mask-image:linear-gradient(to_bottom,black,black_55%,transparent_85%)]" />
        <HomeNav bookHref={book} />

        <section className="mx-auto grid max-w-6xl gap-12 px-6 pt-12 pb-16 md:pt-20 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <h1 className="text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.03em] text-balance md:text-[3.9rem]">Cold call practice on AI prospects, so you don&apos;t burn your leads.</h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-white/80">
              Real voice calls in the browser, with AI prospects built from the accounts your reps are working this quarter. Every call comes back scored, with the one thing to fix before the next dial.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <form action={callKaren}>
                <button type="submit" className="flex h-12 cursor-pointer items-center gap-3 rounded-full bg-[var(--hp-peach)] pr-2 pl-5 font-semibold text-[var(--hp-navy)] outline-none hover:brightness-105 focus-visible:ring-[3px] focus-visible:ring-white/50">
                  Call Karen now
                  <span className="grid size-8 place-items-center rounded-full bg-[var(--hp-navy)] text-[var(--hp-peach)]"><Phone className="size-4" /></span>
                </button>
              </form>
              <CtaLink ctaId="home_hero_trial" href="/signup" className="flex h-12 items-center rounded-full border border-white/40 px-5 font-semibold hover:bg-white/10">Start free team trial</CtaLink>
            </div>
            <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-white/65">Three minutes, no email needed. Allow your mic and Karen picks up. We record the call so the coach can score it, then ask where to send your score.</p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/80">
              {["Real voice calls, nothing to install", "Prospects from your accounts", `Team trial: ${TRIAL.calls} calls, ${TRIAL.days} days, no card`].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="size-3.5 text-[var(--hp-peach)]" />{t}</li>
              ))}
            </ul>
            <figure className="mt-8 flex max-w-xl gap-4 border-t border-white/15 pt-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-sm font-semibold">{SALESFORGE.initials}</span>
              <div>
                <blockquote className="text-[17px] leading-snug font-medium">“{SALESFORGE.pull}”</blockquote>
                <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-white/70">
                  <span><span className="font-semibold text-white">{SALESFORGE.name}</span>, {SALESFORGE.shortTitle}</span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[var(--hp-navy)]">{SALESFORGE.company}</span>
                </figcaption>
              </div>
            </figure>
          </div>

          <aside aria-label="Karen, the prospect" className="rounded-3xl border border-white/12 bg-[rgba(18,24,33,.72)] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)] backdrop-blur-md lg:ml-auto lg:w-[24rem]">
            <div className="flex items-start gap-3">
              <span className="size-11 shrink-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffd9a8,#f08a3c_45%,#7a2e12)]" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{KAREN.name}</div>
                <div className="text-[13px] text-white/65">{KAREN.title}, {KAREN.company}</div>
              </div>
              <span className="text-sm text-[var(--hp-peach)] tabular-nums">0:07</span>
            </div>
            <div className="mt-5"><Wave /></div>
            <p className="mt-5 text-[21px] leading-snug font-semibold">“{KAREN.objections[0]}”</p>
            <p className="mt-5 border-t border-white/12 pt-4 text-[13px] leading-relaxed text-white/65">One of her lines on a real practice call. Stay calm, earn twenty seconds, and the coach scores how you did.</p>
          </aside>
        </section>

        {/* How it works, then the product */}
        <div id="how" className="mx-auto max-w-6xl px-6">
          <ol className="relative mx-auto flex max-w-3xl flex-wrap justify-center gap-2 md:justify-between">
            <span aria-hidden className="absolute top-1/2 right-6 left-6 hidden h-px bg-white/15 md:block" />
            {STEPS.map((s, i) => (
              <li key={s} className="relative rounded-full border border-white/15 bg-[var(--hp-navy)] px-3 py-1.5 text-[13px] text-white/85">
                <span className="mr-1.5 font-semibold text-[var(--hp-peach)]">{i + 1}</span>{s}
              </li>
            ))}
          </ol>

          <div className="mt-6 grid overflow-hidden rounded-t-2xl bg-[var(--hp-card)] text-[var(--hp-ink)] shadow-[0_-20px_60px_-20px_rgba(0,0,0,.5)] md:grid-cols-[13rem_1fr]">
            <aside className="hidden border-r border-black/8 p-4 md:block">
              <div className="flex items-center gap-2 text-[15px] font-semibold">
                <span className="relative grid size-6 place-items-center rounded-md bg-[var(--hp-navy)] text-white"><span className="absolute top-0.5 right-0.5 size-1 rounded-full bg-[var(--hp-peach)]" /><Phone className="size-3" /></span>
                {SITE.name}
              </div>
              <ul className="mt-6 space-y-1 text-sm">
                {[["Practice", ""], ["Prospects", "6"], ["Calls", ""], ["Team", ""], ["Objections", "15"]].map(([l, n]) => (
                  <li key={l} className={cn("flex justify-between rounded-md px-2 py-1.5", l === "Calls" && "bg-[var(--hp-cream)] font-medium")}>{l}<span className="text-black/45">{n}</span></li>
                ))}
              </ul>
            </aside>
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Call review</div>
                  <div className="text-[13px] text-black/55">Sam · Karen Whitlock · hung up at 2:12 · sample call</div>
                </div>
                <form action={callKaren}><button type="submit" className="cursor-pointer rounded-md bg-[var(--hp-navy)] px-3 py-1.5 text-[13px] font-medium text-white">Call Karen again</button></form>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <ol className="space-y-4 rounded-xl border border-black/8 bg-white/60 p-4 text-sm">
                  <li><div className="font-semibold">Karen <span className="font-normal text-black/45">0:00</span></div><p>“This had better be important.”</p></li>
                  <li>
                    <div className="font-semibold">Sam <span className="font-normal text-black/45">0:03</span></div>
                    <p>“Karen, Sam from Northwind. I know I&apos;m an interruption. Twenty seconds on why I called, then you decide?”</p>
                    <p className="mt-2 rounded-md bg-[#fbe9d6] px-3 py-1.5 text-[13px] text-[#7a3a14]">Coach: good permission ask. You named the interruption.</p>
                  </li>
                  <li><div className="font-semibold">Karen <span className="font-normal text-black/45">0:09</span></div><p>“Who gave you this number?”</p></li>
                </ol>
                <div className="rounded-xl border border-black/8 bg-white/60 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">Scorecard</span>
                    <span><span className="text-3xl font-semibold tabular-nums">6.6</span><span className="text-sm text-black/45"> /10</span></span>
                  </div>
                  <dl className="mt-3 space-y-2">
                    {RUBRIC_KEYS.map((k) => (
                      <div key={k} className="grid grid-cols-[8.5rem_1fr_1.5ch] items-center gap-3 text-[13px]">
                        <dt>{RUBRIC[k].label}</dt>
                        <dd className="h-1.5 rounded-full bg-black/8"><div className={cn("h-full rounded-full", k === "value_prop" ? "bg-[var(--hp-rust)]" : "bg-[var(--hp-navy)]")} style={{ width: `${SCORES[k] * 10}%` }} /></dd>
                        <dd className="text-right tabular-nums">{SCORES[k]}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 rounded-md bg-[#fbe9d6] px-3 py-2 text-[13px] text-[#4a2510]"><span className="font-semibold">Fix this first:</span> value proposition. You earned twenty seconds and spent them on the product.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript sources */}
      <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-3 px-6 py-12">
        <span className="text-sm text-black/60">Prospects shaped by your call transcripts from</span>
        {["Gong", "Chorus", "Apollo", "your dialer"].map((n) => <span key={n} className="text-xl font-semibold tracking-tight text-[var(--hp-navy)]">{n}</span>)}
      </section>

      {/* What practicing on real leads costs */}
      <section className="mx-3 rounded-[28px] bg-[var(--hp-navy)] px-6 py-16 text-center text-white md:mx-4 md:py-20">
        <h2 className="mx-auto max-w-2xl text-[2rem] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[2.6rem]">
          <span className="text-white/55">A new rep burns 30 to 50 real conversations while learning.</span> Right now your pipeline pays for them.
        </h2>
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-start justify-center gap-x-6 gap-y-6">
          {[["30–50", "real conversations burned in month one", ""], ["×", "", "op"], ["~$100", "to get each one", ""], ["=", "", "op"], ["$3–5k", "of pipeline spent on practice", "hot"]].map(([big, cap, k]) => (
            <div key={big} className={cn("text-left", k === "op" && "pt-5 text-2xl text-white/45")}>
              {k === "op" ? big : <>
                <div className={cn("text-5xl font-semibold tracking-[-0.03em] tabular-nums md:text-6xl", k === "hot" && "text-[var(--hp-peach)]")}>{big}</div>
                <div className="mt-2 text-[13px] text-white/70">{cap}</div>
              </>}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-md text-[15px] leading-relaxed text-white/85">Or ${price("starter", "month")} a rep a month for {starter.callsPerSeat} practice calls on AI prospects. Reps make the bad calls there, then pick up the phone ready.</p>
        <p className="mt-4 text-[12px] text-white/55">Sources: Stealth Agents 2025 · Skipcall · Prospeo · The Starr Conspiracy citing Belkins 2024.</p>
      </section>

      {/* Levels */}
      <section className="mx-auto max-w-6xl px-6 pt-20 md:pt-24">
        <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2.5rem]">Four levels. The last one is Karen.</h2>
        <p className="mt-3 max-w-md text-[15px] text-black/70">Three calls averaging 7 or better and we suggest the next level. Every level is open from day one.</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <ol className="divide-y divide-black/10 border-y border-black/10">
            {LEVEL_LIST.map((l) => (
              <li key={l.id} className="flex gap-4 py-5">
                <span aria-hidden className="flex h-4 items-end gap-[2px] pt-0.5">
                  {[1, 2, 3].map((b) => <span key={b} className={cn("w-[3px] rounded-sm", b <= l.level ? "bg-[var(--hp-rust)]" : "bg-black/15")} style={{ height: 5 + b * 4 }} />)}
                </span>
                <div>
                  <div className="text-[12px] font-medium text-[var(--hp-rust)]">Level {l.level} · {l.name}</div>
                  <div className="mt-1 text-lg font-semibold">“{FIRST_LINE[l.id]}”</div>
                  <p className="mt-1 text-sm text-black/70">{LEVEL_NOTE[l.id]}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="relative isolate overflow-hidden rounded-3xl bg-[var(--hp-navy)] p-8 text-white">
            <Aurora className="-z-10 opacity-70 [mask-image:linear-gradient(to_top,black,transparent_60%)]" />
            <div className="text-[12px] font-medium text-[var(--hp-peach)]">Level 4 · Boss fight</div>
            <p className="mt-4 text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2.1rem]">“{KAREN.objections[0]}”</p>
            <p className="mt-3 text-sm text-white/75">{KAREN.name}, {KAREN.title}, {KAREN.company}</p>
            <p className="mt-8 text-sm leading-relaxed text-white/85">Staying calm is the win, and that&apos;s what the coach scores.<br />If Karen&apos;s too easy, {jax.name} and {victor.name} are next.</p>
            <Link href="/karen" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--hp-navy)]">Try to get past Karen →</Link>
          </div>
        </div>
      </section>

      {/* Objections */}
      <section className="mx-auto max-w-6xl px-6 pt-20 md:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2.5rem]">The objections they&apos;ll hear on Monday.</h2>
          <Link href="/objections" className="text-sm font-medium underline underline-offset-4">Read all 15 in the library</Link>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {objections.map((o) => (
            <li key={o.slug}>
              <Link href={`/objections/${o.slug}`} className="block h-full rounded-2xl bg-[var(--hp-card)] p-5 transition-colors hover:bg-white">
                <div className="text-[17px] font-semibold">“{o.phrasings[0] ?? o.label}”</div>
                <p className="mt-2 text-sm text-black/70">{o.coaching}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Managers */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pt-20 md:pt-24 lg:grid-cols-[0.75fr_2fr] lg:items-center">
        <div>
          <div className="text-[13px] font-medium text-[var(--hp-rust)]">For managers</div>
          <h2 className="mt-2 text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.02em]">Coach the pattern instead of one recording.</h2>
          <p className="mt-3 text-sm leading-relaxed text-black/70">Every rep&apos;s six skills side by side, weakest first, plus the objection that ends the most calls.</p>
          <Link href="/for-managers" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">See the manager view</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-[var(--hp-card)] p-4">
          <table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="text-[12px] text-black/55"><th className="py-2 text-left font-normal">Rep</th>{TEAM_HEAD.map((h) => <th key={h} className="py-2 font-normal">{h}</th>)}<th className="py-2 font-semibold text-black/80">Avg</th></tr></thead>
            <tbody className="divide-y divide-black/8">
              {TEAM.map(([name, s]) => (
                <tr key={name}>
                  <td className="py-2.5 font-medium">{name}</td>
                  {s.map((v, i) => <td key={i} className="py-2.5 text-center tabular-nums"><span className={cn("inline-block min-w-7 rounded px-1.5 py-0.5", v <= 4 && "bg-[#f8d9b8] text-[#5a2a0e]")}>{v}</span></td>)}
                  <td className="py-2.5 text-center font-semibold tabular-nums">{(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-black/55">Sample team, illustrative. Highlighted = 4 or below.</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 pt-20 md:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] md:text-[2.5rem]">Per rep, per month. One seat is fine.</h2>
          <span className="text-sm text-black/70">Try {TRIAL.calls} calls first: {TRIAL.days} days, no card.</span>
        </div>
        {offer && (
          <p className="mt-6 rounded-xl bg-[#fbe9d6] px-4 py-3 text-sm text-[#4a2510]"><span className="font-semibold">Founding price until {offer.untilLabel}.</span> Pay yearly and it&apos;s ${price("starter", "year")} or ${price("team", "year")} a seat a month. You keep the price as long as you stay subscribed.</p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Link href="/pricing" className="rounded-2xl bg-[var(--hp-card)] p-6 hover:bg-white">
            <div className="text-sm font-semibold">{starter.name}</div>
            <div className="mt-2"><span className="text-5xl font-semibold tracking-[-0.03em]">${price("starter", "month")}</span><span className="text-sm text-black/60"> /rep/month</span></div>
            <p className="mt-3 text-sm text-black/70">{starter.callsPerSeat} practice calls a month per seat. ${price("starter", "year")} a month if you pay yearly.</p>
          </Link>
          <Link href="/pricing" className="rounded-2xl bg-[var(--hp-navy)] p-6 text-white hover:brightness-110">
            <div className="flex justify-between text-sm font-semibold">{team.name}<span className="text-[12px] text-[var(--hp-peach)]">With manager view</span></div>
            <div className="mt-2"><span className="text-5xl font-semibold tracking-[-0.03em]">${price("team", "month")}</span><span className="text-sm text-white/65"> /rep/month</span></div>
            <p className="mt-3 text-sm text-white/80">{team.callsPerSeat} calls a seat, shared across the team, plus the manager view. ${price("team", "year")} a month if you pay yearly.</p>
          </Link>
          <a href={bookingUrl("home_enterprise")} className="rounded-2xl bg-[var(--hp-card)] p-6 hover:bg-white">
            <div className="text-sm font-semibold">{enterprise.name}</div>
            <div className="mt-2 text-5xl font-semibold tracking-[-0.03em]">Custom</div>
            <p className="mt-3 text-sm text-black/70">From {enterprise.minSeats} seats, with SSO, security review and custom personas.</p>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:py-24 lg:grid-cols-[0.75fr_2fr]">
        <h2 className="text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.02em]">Questions sales leaders ask.</h2>
        <div className="divide-y divide-black/12 border-y border-black/12">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{q}<Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" /></summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      </main>

      {/* Closing band and footer */}
      <footer className="relative isolate mx-3 mb-3 overflow-hidden rounded-[28px] bg-[var(--hp-deep)] px-6 pt-20 text-white md:mx-4">
        <Aurora className="-z-10 [mask-image:linear-gradient(to_top,black,transparent_75%)]" />
        <div className="text-center">
          <h2 className="text-[2.2rem] leading-[1.08] font-semibold tracking-[-0.02em] md:text-[2.8rem]">Tell us about your team<br /><span className="text-white/60">and the accounts they call.</span></h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] text-white/80">Thirty minutes. We&apos;ll build a prospect from one of your real accounts, and you can call it on the spot.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={bookingUrl("home_closing")} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--hp-deep)]">Book a 30-minute call</a>
            <CtaLink ctaId="home_closing_trial" href="/signup" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15">Start free trial</CtaLink>
          </div>
        </div>
        <div className="mx-auto mt-24 grid max-w-6xl gap-8 border-t border-white/12 pt-10 text-sm sm:grid-cols-3">
          {FOOTER_COLS.map((c) => (
            <div key={c.title}>
              <div className="mb-3 text-[12px] text-white/55">{c.title}</div>
              <ul className="space-y-2 text-white/80">
                {c.links.map(([href, label]) => <li key={href}><Link href={href} className="underline-offset-4 hover:text-white hover:underline">{label}</Link></li>)}
                {c.title === "Legal" && <li><CookieSettingsLink /></li>}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-6 text-[12px] text-white/70">
          <span>© {new Date().getFullYear()} {SITE.name}{SITE.company.legalName !== SITE.name ? ` · ${SITE.company.legalName}` : ""}</span>
          <a href={`mailto:${SITE.company.email}`} className="underline underline-offset-4">{SITE.company.email}</a>
        </div>
      </footer>
    </div>
  );
}
