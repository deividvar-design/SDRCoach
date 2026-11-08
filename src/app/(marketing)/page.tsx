import Link from "next/link";
import { Glow } from "@/components/marketing/glow";
import { BookOpen, Mic, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL } from "@/lib/billing/plans";
import { starterMonthlyUsd } from "@/lib/billing/founding";
import { formatMoney } from "@/lib/billing/currency";
import { CostOfPractice } from "@/components/marketing/cost-of-practice";
import { SampleCall } from "@/components/marketing/sample-call";
import { ProofCall } from "@/components/marketing/proof-call";
import { ResearchCards } from "@/components/marketing/research-cards";
import { TranscriptSources } from "@/components/marketing/transcript-sources";
import { BossFights } from "@/components/marketing/boss-fights";
import { Ladder } from "@/components/marketing/ladder";
import { Heatmap } from "@/components/marketing/heatmap";
import { FounderNote } from "@/components/marketing/founder-note";
import { CtaBand, H2, Section } from "@/components/marketing/sections";
import { JsonLd, organizationLd, softwareLd } from "@/components/seo/json-ld";
import { HERO_COPY, heroVariant } from "@/lib/marketing/hero";
import { karenHangUpsThisMonth } from "@/lib/demo/share";
import { getAllObjectionPages } from "@/lib/objections";
import { pageMetadata } from "@/lib/seo";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { KarenHero } from "@/components/marketing/karen-hero";
import { TestimonialCard } from "@/components/marketing/testimonial";
import { SALESFORGE } from "@/content/testimonials";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "AI cold call simulator for new SDRs",
  description: `Let new SDRs practice cold calls on AI prospects before they touch real leads. Six-skill score after every call. ${TRIAL.calls} free calls, no card.`,
  path: "/",
});

// The Karen counter is a database read; an hourly rebuild keeps the page cached at the edge.
export const revalidate = 3600;

/** The objections shown on the homepage, the ones new reps meet first. */
const FEATURED_OBJECTIONS = ["not-interested", "send-me-an-email", "no-budget", "we-already-have-a-solution", "call-me-back-later", "not-the-decision-maker"];

const STEPS = [
  { icon: Target, title: "Pick who to call", body: "Use one of our six ready-made prospects or three extra-hard ones. Or build your own from the companies on your list. Choose a voice, add their problems and objections, and they're ready to call." },
  { icon: Mic, title: "Dial", body: "It's a real voice call, and you can talk over each other. Level 1 is friendly. Level 3 tries to hang up on you. The prospect decides how the call ends and tells you why." },
  { icon: TrendingUp, title: "Get your score", body: "Every call is saved with its recording and transcript. Ask for a review and the coach scores six skills and marks every objection. Then it tells you the one thing to change next time." },
];


export default async function HomePage() {
  const variant = heroVariant();
  const hangUps = await karenHangUpsThisMonth().catch(() => 0);
  const objections = getAllObjectionPages().filter((p) => FEATURED_OBJECTIONS.includes(p.slug)).sort((a, b) => FEATURED_OBJECTIONS.indexOf(a.slug) - FEATURED_OBJECTIONS.indexOf(b.slug));
  const hero = variant === "a" ? null : HERO_COPY[variant];
  const price = formatMoney(await starterMonthlyUsd(), "usd");
  return (
    <>
      <JsonLd data={[organizationLd(), softwareLd()]} />
      {/* "Continue as …" for signed-out visitors. With hero A it starts the Karen call, like the main button. */}
      <GoogleOneTap mode={hero ? "signup" : "karen"} next={hero ? "/onboarding" : "/karen/start"} />

      {/* 1. Hero. HERO_VARIANT switches between A (default) and the two earlier headlines. */}
      {!hero ? (
        <>
          <Glow><KarenHero /></Glow>
          <CostOfPractice price={price} />
          <Section className="border-t">
            <H2>What a scored call looks like.</H2>
            <p className="text-muted-foreground text-body mt-4 max-w-2xl">
              After each call, the coach gives six scores out of 10. It quotes what the rep really said and picks one thing to fix before the next call. Here's a sample call with Karen.
            </p>
            <div className="mt-8"><ProofCall /></div>
          </Section>
        </>
      ) : (
      <Section className="pt-10 md:pt-14" data-hero={variant}>
        <div>
          <h1 className={cn("font-display enter mt-4 leading-[0.98]", hero.large ? "text-[3.4rem] md:text-[5.5rem] xl:text-[7.5rem]" : "text-[2.75rem] md:text-[4.25rem] xl:text-[5.75rem]")} style={{ "--enter-delay": "0ms" } as React.CSSProperties}>
            {hero.headline.map((line, i) => <span key={line} className="md:block">{i > 0 ? " " : ""}{line}</span>)}
          </h1>
          <p className={cn("font-display enter mt-5 max-w-3xl text-balance", hero.large ? "text-2xl text-muted-foreground md:text-3xl" : "text-signal text-3xl md:text-5xl")} style={{ "--enter-delay": "90ms" } as React.CSSProperties}>{hero.sub}</p>
          <p className="text-muted-foreground enter mt-5 max-w-2xl" style={{ "--enter-delay": "120ms" } as React.CSSProperties}>
            100 Dials is an AI cold call simulator for SDR teams. Reps call AI prospects that sound real. Every call gets a score, and managers see where the team needs help.
          </p>
          <div className="enter mt-8 flex flex-wrap items-center gap-4" style={{ "--enter-delay": "140ms" } as React.CSSProperties}>
            <Button size="xl" variant="signal" asChild><Link href="/karen">Pick up</Link></Button>
            <Button size="xl" variant="outline" asChild><Link href="/signup">Start free trial</Link></Button>
            <p className="text-muted-foreground w-full md:w-auto">{TRIAL.calls} free calls, {TRIAL.days} days, no card, any email.</p>
          </div>
        </div>
        <div className="enter mt-10" style={{ "--enter-delay": "240ms" } as React.CSSProperties}>
          <SampleCall autoStart />
        </div>
      </Section>
      )}

      {/* 1b. A customer, in their words, between the sample scorecard and how it works. */}
      <TestimonialCard t={SALESFORGE} />

      {/* 2. How it works */}
      <Section id="how-it-works" className="border-t">
        <H2>How it works, in three steps.</H2>
        {!hero && (
          <p className="text-muted-foreground text-body mt-4 max-w-2xl">
            100 Dials is an AI cold call simulator for SDR teams. Reps call AI prospects that sound real. Every call gets a score, and managers see where the team needs help.
          </p>
        )}
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.title} className="border-t pt-5">
              <s.icon className="text-signal-ink size-5" />
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="text-muted-foreground text-body mt-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 3. The ladder */}
      <Section className="border-t">
        <H2>It gets harder. That's the point.</H2>
        <div className="mt-10"><Ladder /></div>
        <p className="text-muted-foreground mt-5 max-w-2xl">After three calls that average 7 or more, we suggest the next level. Every level is open from day one.</p>
      </Section>

      {/* 4. Boss fights */}
      <BossFights hangUps={hangUps} />

      {/* 5. For the manager */}
      <Section>
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <H2>See what your whole team keeps getting wrong.</H2>
          </div>
          <p className="text-muted-foreground text-body max-w-xl">
            You don't need to listen to 50 calls to know what to fix. Every scored call adds to one view: your team's weakest skill and the objection they lose to most. Bring it to your next team meeting and work on it for ten minutes.
          </p>
        </div>
        <div className="mt-8"><Heatmap /></div>
        <Button className="mt-6" variant="outline" asChild><Link href="/for-managers">How managers use it</Link></Button>
      </Section>

      {/* 6. Grounded in your calls */}
      <Section className="border-t">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <H2>Prospects that sound like your real buyers.</H2>
            <p className="text-muted-foreground text-body mt-5">
              Upload call transcripts from Gong, Chorus, Apollo or your dialer. 100 Dials learns how your buyers talk and which objections they raise. Then your AI prospects say the same things. The coach scores reps against your own playbook.
            </p>
            <TranscriptSources className="mt-6" />
            <Button className="mt-6" variant="outline" asChild><Link href="/for-enablement">How sales training teams use it</Link></Button>
          </div>
          <div className="stage text-paper rounded-2xl p-6 md:p-8" data-ui>
            <div className="text-paper/60 mb-4 flex items-center gap-2 text-sm"><BookOpen className="size-4" /> What we learned from your calls</div>
            <dl className="divide-y divide-white/10">
              {[
                ["Objection, in their words", "“We already run Samsara on half the trucks.”"],
                ["Tone", "Short answers. Hates scripts. Warms up when you talk about fuel cost per mile."],
                ["What got meetings booked", "A reason for calling tied to fleet growth in the first 20 seconds."],
              ].map(([k, v]) => (
                <div key={k} className="py-3">
                  <dt className="text-paper/60 text-sm">{k}</dt>
                  <dd className="font-display mt-1 text-2xl leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* 7. The objection library: the content that earns the search traffic, linked from the page that gets it */}
      <ResearchCards />

      <Section className="border-t">
        <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-start">
          <div>
            <H2>The objections every new rep fumbles.</H2>
            <p className="text-muted-foreground text-body mt-5">
              We wrote up 15 of them. Each one covers what it really means, three ways to answer it, and the mistakes that lose the call. Our AI prospects use the same lines, so reps can read them first.
            </p>
            <Button className="mt-6" variant="outline" asChild><Link href="/objections">Read the objection library</Link></Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {objections.map((o) => (
              <li key={o.slug}>
                <Link href={`/objections/${o.slug}`} className="bg-card block h-full rounded-2xl border p-5 transition-shadow hover:shadow-md">
                  <div className="font-display text-2xl leading-snug">“{o.phrasings[0] ?? o.label}”</div>
                  <div className="text-muted-foreground mt-2 text-sm">{o.coaching}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 8. Founder note */}
      <FounderNote />

      <CtaBand note={`${TRIAL.calls} calls, ${TRIAL.days} days, any email. Then ${price} a rep per month.`} />
    </>
  );
}
