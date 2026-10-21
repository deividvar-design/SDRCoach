import Link from "next/link";
import { BookOpen, Mic, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL } from "@/lib/billing/plans";
import { SampleCall } from "@/components/marketing/sample-call";
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
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "AI cold call simulator for new SDRs",
  description: "New reps dial realistic AI prospects built from your own targets and get scored on six skills before they touch your pipeline. Free trial, work email only.",
  path: "/",
});

// The Karen counter is a database read; an hourly rebuild keeps the page cached at the edge.
export const revalidate = 3600;

/** The objections shown on the homepage, the ones new reps meet first. */
const FEATURED_OBJECTIONS = ["not-interested", "send-me-an-email", "no-budget", "we-already-have-a-solution", "call-me-back-later", "not-the-decision-maker"];

const STEPS = [
  { icon: Target, title: "Add who you're calling", body: "Real accounts from this quarter's list, or one of six built-in personas and three boss fights. Pick a voice, add the pains and objections, and each one becomes a live prospect." },
  { icon: Mic, title: "Dial", body: "A real, interruptible voice call. Level 1 is friendly. Level 3 tries to hang up on you. The prospect decides how it ends, and says why." },
  { icon: TrendingUp, title: "Get coached, when you want it", body: "Every call keeps its transcript, stats and outcome. Ask for the review and the coach scores six skills, tags every objection and names the one thing to change next time." },
];


export default async function HomePage() {
  const variant = heroVariant();
  const hangUps = await karenHangUpsThisMonth().catch(() => 0);
  const objections = getAllObjectionPages().filter((p) => FEATURED_OBJECTIONS.includes(p.slug)).sort((a, b) => FEATURED_OBJECTIONS.indexOf(a.slug) - FEATURED_OBJECTIONS.indexOf(b.slug));
  const hero = HERO_COPY[variant];
  return (
    <>
      <JsonLd data={[organizationLd(), softwareLd()]} />

      {/* 1. Hero. Two headlines under test; the variant travels with the signup event. */}
      <Section className="pt-10 md:pt-14" data-hero={variant}>
        <div>
          <h1 className={cn("font-display enter mt-4 leading-[0.98]", hero.large ? "text-[3.4rem] md:text-[5.5rem] xl:text-[7.5rem]" : "text-[2.75rem] md:text-[4.25rem] xl:text-[5.75rem]")} style={{ "--enter-delay": "0ms" } as React.CSSProperties}>
            {hero.headline.map((line, i) => <span key={line} className="md:block">{i > 0 ? " " : ""}{line}</span>)}
          </h1>
          <p className={cn("font-display enter mt-5 max-w-3xl text-balance", hero.large ? "text-2xl text-muted-foreground md:text-3xl" : "text-signal text-3xl md:text-5xl")} style={{ "--enter-delay": "90ms" } as React.CSSProperties}>{hero.sub}</p>
          <p className="text-muted-foreground enter mt-5 max-w-2xl" style={{ "--enter-delay": "120ms" } as React.CSSProperties}>
            100 Dials is an AI cold call simulator for SDR teams. Reps dial realistic prospects built from their own target accounts, every call is scored on six skills, and managers see where the team struggles.
          </p>
          <div className="enter mt-8 flex flex-wrap items-center gap-4" style={{ "--enter-delay": "140ms" } as React.CSSProperties}>
            <Button size="xl" variant="signal" asChild><Link href="/karen">Pick up</Link></Button>
            <Button size="xl" variant="outline" asChild><Link href="/signup">Start free trial</Link></Button>
            <p className="text-muted-foreground w-full md:w-auto">{TRIAL.calls} free calls, {TRIAL.days} days, no card, work email only.</p>
          </div>
        </div>
        <div className="enter mt-10" style={{ "--enter-delay": "240ms" } as React.CSSProperties}>
          <SampleCall autoStart />
        </div>
      </Section>

      {/* 2. How it works */}
      <Section id="how-it-works" className="border-t">
        <H2>Three steps between a new rep and a booked meeting.</H2>
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
        <H2>It gets harder. That is the point.</H2>
        <div className="mt-10"><Ladder /></div>
        <p className="text-muted-foreground mt-5 max-w-2xl">Reps are nudged up a level after three calls averaging seven or better. Nothing is locked.</p>
      </Section>

      {/* 4. Boss fights */}
      <BossFights hangUps={hangUps} />

      {/* 5. For the manager */}
      <Section>
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <H2>Coach the pattern, not the call.</H2>
          </div>
          <p className="text-muted-foreground text-body max-w-xl">
            You do not have to listen to fifty calls to know what to fix. Every reviewed call feeds one view: the weakest skill across the team, and the objection the team keeps losing. Ten minutes in the next team meeting.
          </p>
        </div>
        <div className="mt-8"><Heatmap /></div>
        <Button className="mt-6" variant="outline" asChild><Link href="/for-managers">How managers use it</Link></Button>
      </Section>

      {/* 6. Grounded in your calls */}
      <Section className="border-t">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <H2>Prospects that sound like your market, not like a chatbot.</H2>
            <p className="text-muted-foreground text-body mt-5">
              Upload transcripts from Gong, Chorus or your dialer. 100 Dials extracts how your buyers talk, the objections they actually raise and the phrasing they use, then puts it in the prospect's mouth. The coach grades against your playbook, not a generic one.
            </p>
            <Button className="mt-6" variant="outline" asChild><Link href="/for-enablement">How enablement teams use it</Link></Button>
          </div>
          <div className="stage text-paper rounded-2xl p-6 md:p-8" data-ui>
            <div className="text-paper/60 mb-4 flex items-center gap-2 text-sm"><BookOpen className="size-4" /> Digest from uploaded calls</div>
            <dl className="divide-y divide-white/10">
              {[
                ["Objection, in their words", "“We already run Samsara on half the trucks.”"],
                ["Tone", "Short answers. Impatient with scripts. Warms up to fuel-cost-per-mile language."],
                ["What booked meetings", "A reason for calling tied to fleet growth in the first twenty seconds."],
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
      <Section className="border-t">
        <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-start">
          <div>
            <H2>The objections every new rep fumbles.</H2>
            <p className="text-muted-foreground text-body mt-5">
              Fifteen of them, written up: what each one really means, three ways to answer it, and the mistakes that lose the call. The same lines the AI prospects use, so reps can read them before they hear them.
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

      <CtaBand />
    </>
  );
}
