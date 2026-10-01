import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GraduationCap, MessageSquareText, Mic, Target, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEVEL_LIST } from "@/lib/domain/levels";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { SITE } from "@/lib/site";
import { TRIAL } from "@/lib/billing/plans";
import { SampleCall } from "@/components/marketing/sample-call";
import { CtaBand, Eyebrow, H2, ProofSection, Section } from "@/components/marketing/sections";
import { JsonLd, organizationLd, softwareLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "100 Dials: Cold Call Coach for SDR teams" },
  description: "Reps dial realistic AI prospects built from your own targets. Every call ends with the prospect's decision and a transcript; a scored coach's review is one click away. Managers see where the team struggles and what prospects push back on. Free trial, work email only.",
  alternates: { canonical: "/" },
};

const STEPS = [
  { icon: Target, title: "Add who you're calling", body: "Real accounts from this quarter's list, or one of six built-in personas. Pick a voice, add the pains and objections, and each one becomes a live prospect." },
  { icon: Mic, title: "Dial", body: "A real, interruptible voice call. Level 1 is friendly. Level 3 tries to hang up on you. The prospect decides how it ends, and says why." },
  { icon: TrendingUp, title: "Get coached, when you want it", body: "Every call keeps its transcript, stats and outcome. Ask for the review and the coach scores six skills, tags every objection and names the one thing to change next time." },
];

const MANAGER_VIEW = [
  { icon: GraduationCap, title: "Skills by rep", body: "One heatmap: six skills across every rep, weakest first, so the next 1:1 starts from evidence." },
  { icon: MessageSquareText, title: "What prospects push back on", body: "Every objection the coach tagged, ranked by frequency, with how often the team handled it cleanly and who struggles with it." },
  { icon: Trophy, title: "A floor that competes", body: "Streaks, personal bests and a weekly leaderboard reps can see. Notes from you land on their dashboard. A Monday digest lands in yours." },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationLd(), softwareLd()]} />

      <Section className="pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="enter" style={{ "--enter-delay": "60ms" } as React.CSSProperties}><Eyebrow>AI cold-call training for SDR teams</Eyebrow></div>
          <h1 className="font-display enter mt-4 text-5xl text-balance md:text-7xl" style={{ "--enter-delay": "0ms" } as React.CSSProperties}>{SITE.tagline}</h1>
          <p className="text-muted-foreground enter mx-auto mt-6 max-w-2xl text-lg text-balance" style={{ "--enter-delay": "110ms" } as React.CSSProperties}>
            Your reps dial an AI prospect built from your real targets, at three levels of difficulty. Every call ends with the prospect's decision, a transcript and a replay. A scored coach's review is one click away. You see who's ready for the phones, where the team struggles and what prospects push back on.
          </p>
          <div className="enter mt-8 flex flex-wrap justify-center gap-3" style={{ "--enter-delay": "160ms" } as React.CSSProperties}>
            <Button size="lg" variant="signal" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild><Link href="/pricing">See pricing</Link></Button>
          </div>
          <p className="text-muted-foreground enter mt-4 text-sm" style={{ "--enter-delay": "200ms" } as React.CSSProperties}>{TRIAL.calls} free calls, {TRIAL.days} days, no card, work email only</p>
        </div>
        <div className="enter mt-14" style={{ "--enter-delay": "300ms" } as React.CSSProperties}>
          <SampleCall autoStart />
          <p className="text-muted-foreground mt-3 text-center text-xs">A scripted example of a Level 3 call, shown as text. Your prospects speak, interrupt, and sound like your market.</p>
        </div>
      </Section>

      <Section className="border-t">
        <Eyebrow>How it works</Eyebrow>
        <H2>Three steps between a new rep and a booked meeting.</H2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t pt-6">
              <div className="flex items-center justify-between">
                <s.icon className="text-signal size-5" />
                <span className="text-muted-foreground text-sm">{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="border-t">
        <Eyebrow>Three levels</Eyebrow>
        <H2>From friendly to “who is this and why are you calling?”</H2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {LEVEL_LIST.map((l) => (
            <div key={l.id} className="bg-card rounded-2xl border p-6">
              <div className="text-muted-foreground font-mono text-xs">Level {l.level}</div>
              <h3 className="font-display mt-2 text-2xl">{l.name}</h3>
              <p className="text-signal mt-1 text-sm">{l.tagline}</p>
              <p className="text-muted-foreground mt-3 text-sm">{l.description}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 max-w-2xl text-sm">
          Reps are nudged up a level after three calls averaging seven or better. Nothing is locked, because the point is confidence on the real dial, not a badge.
        </p>
      </Section>

      <Section className="border-t">
        <Eyebrow>Then there's Karen</Eyebrow>
        <H2>Boss fights, for when Level 3 stops being scary.</H2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {BOSS_PERSONAS.map((b) => (
            <div key={b.name} className="bg-card rounded-2xl border p-6">
              <div className="text-muted-foreground text-xs">{b.title}</div>
              <h3 className="font-display mt-2 text-2xl">{b.name}</h3>
              <p className="text-signal mt-3 text-sm">“{b.objections[0]}”</p>
              <p className="text-muted-foreground mt-3 text-sm">{b.persona_notes.split(". ").slice(0, 2).join(". ")}.</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button size="lg" variant="signal" asChild><Link href="/karen">Try to survive Karen, no account needed</Link></Button>
          <p className="text-muted-foreground text-sm">Three minutes, a work email, and a scored report after. Nobody books her. Composure is the win.</p>
        </div>
      </Section>

      <Section className="border-t">
        <Eyebrow>For the manager</Eyebrow>
        <H2>Coach the pattern, not the call.</H2>
        <p className="text-muted-foreground mt-5 max-w-2xl">
          You do not have to listen to fifty calls to know what to fix. The coaching view aggregates every reviewed call into the two things worth ten minutes in the next team meeting: the weakest skill and the most mishandled objection.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {MANAGER_VIEW.map((m) => (
            <div key={m.title} className="border-t pt-6">
              <m.icon className="text-signal size-5" />
              <h3 className="mt-4 text-lg font-medium">{m.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{m.body}</p>
            </div>
          ))}
        </div>
        <Button className="mt-8" variant="outline" asChild><Link href="/for-managers">How managers use it</Link></Button>
      </Section>

      <Section className="border-t">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Grounded in your calls</Eyebrow>
            <H2>Prospects that sound like your market, not like a chatbot.</H2>
            <p className="text-muted-foreground mt-5">
              Upload transcripts from Gong, Chorus or your dialer. 100 Dials extracts how your buyers talk, the objections they actually raise and the phrasing they use, then puts it in the prospect's mouth. The coach grades against your playbook, not a generic one.
            </p>
            <Button className="mt-6" variant="outline" asChild><Link href="/for-enablement">How enablement teams use it</Link></Button>
          </div>
          <div className="bg-card rounded-2xl border p-6">
            <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs"><BookOpen className="size-3.5" /> Example digest from uploaded calls</div>
            <ul className="space-y-3 text-sm">
              <li className="rounded-lg border p-3"><span className="text-muted-foreground">Objection, in their words:</span> “We already run Samsara on half the trucks.”</li>
              <li className="rounded-lg border p-3"><span className="text-muted-foreground">Tone:</span> Short answers. Impatient with scripts. Warms up to fuel-cost-per-mile language.</li>
              <li className="rounded-lg border p-3"><span className="text-muted-foreground">What booked meetings:</span> A reason for calling tied to fleet growth in the first twenty seconds.</li>
            </ul>
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
            <Link key={c.href} href={c.href} className="bg-card group rounded-2xl border p-8 transition-shadow hover:shadow-lg">
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
