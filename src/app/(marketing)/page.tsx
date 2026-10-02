import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GraduationCap, MessageSquareText, Mic, Target, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEVEL_LIST } from "@/lib/domain/levels";
import { SITE } from "@/lib/site";
import { TRIAL } from "@/lib/billing/plans";
import Image from "next/image";
import { SampleCall } from "@/components/marketing/sample-call";
import { ObjectionTicker } from "@/components/marketing/objection-ticker";
import { BossFights } from "@/components/marketing/boss-fights";
import { CtaBand, Eyebrow, H2, ProofSection, Section } from "@/components/marketing/sections";
import { JsonLd, organizationLd, softwareLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "100 Dials: Cold Call Coach for SDR teams" },
  description: "Reps dial realistic AI prospects built from your own targets. Every call ends with the prospect's decision and a transcript; a scored coach's review is one click away. Managers see where the team struggles and what prospects push back on. Free trial, work email only.",
  alternates: { canonical: "/" },
};

const STEPS = [
  { icon: Target, title: "Add who you're calling", body: "Real accounts from this quarter's list, or one of six built-in personas and three boss fights. Pick a voice, add the pains and objections, and each one becomes a live prospect." },
  { icon: Mic, title: "Dial", body: "A real, interruptible voice call. Level 1 is friendly. Level 3 tries to hang up on you. The prospect decides how it ends, and says why." },
  { icon: TrendingUp, title: "Get coached, when you want it", body: "Every call keeps its transcript, stats and outcome. Ask for the review and the coach scores six skills, tags every objection and names the one thing to change next time." },
];

const MANAGER_VIEW = [
  { icon: GraduationCap, title: "Skills by rep", body: "One heatmap: six skills across every rep, weakest first, so the next 1:1 starts from evidence." },
  { icon: MessageSquareText, title: "What prospects push back on", body: "Every objection the coach tagged, ranked by frequency, with how often the team handled it cleanly and who struggles with it." },
  { icon: Trophy, title: "A floor that competes", body: "Streaks, personal bests and a weekly leaderboard reps can see. Notes from you land on their dashboard. A Monday digest lands in yours." },
];

const LEVEL_FIRST_LINE: Record<string, string> = { warm: "Hi, this is Dana.", inbound: "Dana speaking.", cold: "Yeah?" };

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationLd(), softwareLd()]} />

      {/* Hero: the pitch on the left, the call itself on the right */}
      <Section className="pt-12 md:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <div className="enter" style={{ "--enter-delay": "60ms" } as React.CSSProperties}><Eyebrow>AI cold-call training for SDR teams</Eyebrow></div>
            <h1 className="font-display enter mt-4 text-5xl text-balance md:text-6xl xl:text-7xl" style={{ "--enter-delay": "0ms" } as React.CSSProperties}>{SITE.tagline}</h1>
            <p className="text-muted-foreground enter mt-6 max-w-xl text-lg" style={{ "--enter-delay": "110ms" } as React.CSSProperties}>
              Reps dial an AI prospect built from your real targets, at three levels of difficulty. The prospect decides how the call ends. The coach scores six skills and names the one thing to change next time.
            </p>
            <div className="enter mt-8 flex flex-wrap gap-3" style={{ "--enter-delay": "160ms" } as React.CSSProperties}>
              <Button size="lg" variant="signal" asChild>
                <Link href="/signup">Start free trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild><Link href="/karen">Try to survive Karen</Link></Button>
            </div>
            <p className="text-muted-foreground enter mt-4 text-sm" style={{ "--enter-delay": "200ms" } as React.CSSProperties}>{TRIAL.calls} free calls, {TRIAL.days} days, no card, work email only.</p>
          </div>
          <div className="enter" style={{ "--enter-delay": "260ms" } as React.CSSProperties}>
            <SampleCall autoStart />
          </div>
        </div>
      </Section>

      <ObjectionTicker />

      <Section>
        <Eyebrow>How it works</Eyebrow>
        <H2>Three steps between a new rep and a booked meeting.</H2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative border-t pt-6">
              <span className="font-display text-muted-foreground/60 absolute -top-7 right-0 text-7xl leading-none select-none">{i + 1}</span>
              <s.icon className="text-signal size-5" />
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Levels: the same prospect, rising hostility, left to right */}
      <Section className="border-t">
        <Eyebrow>Three levels</Eyebrow>
        <H2>From friendly to “who is this and why are you calling?”</H2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {LEVEL_LIST.map((l, i) => (
            <div key={l.id} className={["rounded-2xl border p-7", i === 0 ? "bg-card" : i === 1 ? "bg-secondary" : "stage text-background border-transparent"].join(" ")}>
              <div className={i === 2 ? "text-background/60 text-xs" : "text-muted-foreground text-xs"}>Level {l.level}</div>
              <p className="font-display mt-6 text-4xl leading-tight">“{LEVEL_FIRST_LINE[l.id]}”</p>
              <h3 className="mt-6 text-lg font-medium">{l.name}</h3>
              <p className={["mt-1 text-sm", i === 2 ? "text-signal" : "text-signal"].join(" ")}>{l.tagline}</p>
              <p className={["mt-3 text-sm", i === 2 ? "text-background/70" : "text-muted-foreground"].join(" ")}>{l.description}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 max-w-2xl text-sm">
          Reps are nudged up a level after three calls averaging seven or better. Nothing is locked, because the point is confidence on the real dial, not a badge.
        </p>
      </Section>

      <BossFights />

      {/* The manager's view: the one colour field on the page, with the real product in it */}
      <section className="bg-signal/[0.06] border-y">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:py-24">
          <div>
            <Eyebrow>For the manager</Eyebrow>
            <H2>Coach the pattern, not the call.</H2>
            <p className="text-muted-foreground mt-5">
              You do not have to listen to fifty calls to know what to fix. The coaching view turns every reviewed call into the two things worth ten minutes in the next team meeting: the weakest skill and the most mishandled objection.
            </p>
            <ul className="mt-8 space-y-5">
              {MANAGER_VIEW.map((m) => (
                <li key={m.title} className="flex gap-4">
                  <m.icon className="text-signal mt-0.5 size-5 shrink-0" />
                  <div>
                    <div className="font-medium">{m.title}</div>
                    <p className="text-muted-foreground mt-1 text-sm">{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button className="mt-8" variant="outline" asChild><Link href="/for-managers">How managers use it</Link></Button>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-signal/10 md:translate-x-6 md:rotate-[0.6deg]">
            <div className="flex items-center gap-1.5 border-b px-3 py-2">
              <span className="size-2.5 rounded-full bg-border" /><span className="size-2.5 rounded-full bg-border" /><span className="size-2.5 rounded-full bg-border" />
            </div>
            <Image src="/screens/coaching.png" alt="The coaching view: six skills by rep, and the objections the team mishandles" width={1440} height={900} sizes="(min-width: 768px) 55vw, 100vw" className="h-auto w-full" priority={false} />
          </div>
        </div>
      </section>

      <Section>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Grounded in your calls</Eyebrow>
            <H2>Prospects that sound like your market, not like a chatbot.</H2>
            <p className="text-muted-foreground mt-5">
              Upload transcripts from Gong, Chorus or your dialer. 100 Dials extracts how your buyers talk, the objections they actually raise and the phrasing they use, then puts it in the prospect's mouth. The coach grades against your playbook, not a generic one.
            </p>
            <Button className="mt-6" variant="outline" asChild><Link href="/for-enablement">How enablement teams use it</Link></Button>
          </div>
          <div className="paper-grain rounded-2xl border p-6">
            <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs"><BookOpen className="size-3.5" /> What the digest pulls out of uploaded calls</div>
            <dl className="divide-y">
              {[
                ["Objection, in their words", "“We already run Samsara on half the trucks.”"],
                ["Tone", "Short answers. Impatient with scripts. Warms up to fuel-cost-per-mile language."],
                ["What booked meetings", "A reason for calling tied to fleet growth in the first twenty seconds."],
              ].map(([k, v]) => (
                <div key={k} className="py-3">
                  <dt className="text-muted-foreground text-xs">{k}</dt>
                  <dd className="font-display mt-1 text-xl leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <ProofSection />

      <Section className="border-t">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { href: "/for-managers", title: "For sales managers", body: "Ramp new hires in days, see every rep's weakest skill and the objections the team fumbles, assign practice before the real sequence starts." },
            { href: "/for-enablement", title: "For enablement teams", body: "Turn your call library into a training ground. One rubric, every rep, measurable week over week." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="bg-card group rounded-2xl border p-8 transition-colors hover:bg-accent/40">
              <h3 className="font-display text-3xl">{c.title}</h3>
              <p className="text-muted-foreground mt-3">{c.body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium">Learn more</span>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
