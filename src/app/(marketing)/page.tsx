import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Mic, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEVEL_LIST } from "@/lib/domain/levels";
import { SITE } from "@/lib/site";
import { TRIAL } from "@/lib/billing/plans";
import { SampleCall } from "@/components/marketing/sample-call";
import { CtaBand, Eyebrow, H2, ProofSection, Section } from "@/components/marketing/sections";
import { JsonLd, organizationLd, softwareLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "SDRCoach · AI cold-call training for SDR teams" },
  description: "Reps dial realistic AI prospects built from your own targets and get a scored coaching report after every call. Free trial, work email only.",
  alternates: { canonical: "/" },
};

const STEPS = [
  { icon: Target, title: "Add who you're calling", body: "Real accounts from this quarter's list, or one of six built-in personas. Each becomes a live prospect with its own objections." },
  { icon: Mic, title: "Dial", body: "A real, interruptible voice call. Level 1 is friendly. Level 3 tries to hang up on you. The prospect decides how it ends." },
  { icon: TrendingUp, title: "Get coached in under a minute", body: "Transcript, talk ratio, a six-dimension score and the one thing to do differently next time. Managers see every rep." },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationLd(), softwareLd()]} />

      <Section className="pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>AI cold-call training for SDR teams</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-7xl">{SITE.tagline}</h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-balance">
            Your reps dial an AI prospect built from your real targets and your real call transcripts. They get a score, a coach's breakdown and a replay in under a minute. You see who's ready for the phones.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="signal" asChild>
              <Link href="/signup">Start free trial <ArrowRight /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild><Link href="/pricing">See pricing</Link></Button>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">{TRIAL.calls} free calls · {TRIAL.days} days · no card · work email only</p>
        </div>
        <div className="mt-14">
          <SampleCall />
          <p className="text-muted-foreground mt-3 text-center text-xs">A scripted Level 3 call against a built-in persona. Your prospects sound like your market.</p>
        </div>
      </Section>

      <Section className="border-t">
        <Eyebrow>How it works</Eyebrow>
        <H2>Three steps between a new rep and a booked meeting.</H2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="bg-card rounded-2xl border p-6">
              <div className="flex items-center justify-between">
                <s.icon className="text-signal size-5" />
                <span className="text-muted-foreground font-mono text-xs">0{i + 1}</span>
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
              <div className="text-muted-foreground font-mono text-xs">LEVEL {l.level}</div>
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
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Grounded in your calls</Eyebrow>
            <H2>Prospects that sound like your market, not like a chatbot.</H2>
            <p className="text-muted-foreground mt-5">
              Upload transcripts from Gong, Chorus or your dialer. SDRCoach extracts how your buyers talk, the objections they actually raise and the phrasing they use, then puts it in the prospect's mouth. The coach grades against your playbook, not a generic one.
            </p>
            <Button className="mt-6" variant="outline" asChild><Link href="/for-enablement">How enablement teams use it <ArrowRight /></Link></Button>
          </div>
          <div className="bg-card rounded-2xl border p-6">
            <div className="text-muted-foreground mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase"><BookOpen className="size-3.5" /> From 142 uploaded calls</div>
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
            { href: "/for-managers", title: "For sales managers", body: "Ramp new hires in days, see every rep's weakest skill, assign practice before the real sequence starts." },
            { href: "/for-enablement", title: "For enablement teams", body: "Turn your call library into a training ground. One rubric, every rep, measurable week over week." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="bg-card group rounded-2xl border p-8 transition-shadow hover:shadow-lg">
              <h3 className="font-display text-3xl">{c.title}</h3>
              <p className="text-muted-foreground mt-3">{c.body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium">Learn more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
