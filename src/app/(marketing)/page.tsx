import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Mic, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL } from "@/lib/billing/plans";
import { SampleCall } from "@/components/marketing/sample-call";
import { BossFights } from "@/components/marketing/boss-fights";
import { Ladder } from "@/components/marketing/ladder";
import { Heatmap } from "@/components/marketing/heatmap";
import { FounderNote } from "@/components/marketing/founder-note";
import { CtaBand, Eyebrow, H2, Section } from "@/components/marketing/sections";
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


export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationLd(), softwareLd()]} />

      {/* 1. Hero */}
      <Section className="pt-10 md:pt-14">
        <div>
          <div className="enter" style={{ "--enter-delay": "60ms" } as React.CSSProperties}><Eyebrow>Cold call training for SDR teams</Eyebrow></div>
          <h1 className="font-display enter mt-4 text-[3.6rem] leading-[0.98] md:text-[6.5rem] xl:text-[7.5rem]" style={{ "--enter-delay": "0ms" } as React.CSSProperties}>
            <span className="block">Karen's on the line.</span>
            <span className="block">You have three minutes.</span>
          </h1>
          <div className="enter mt-8 flex flex-wrap items-center gap-4" style={{ "--enter-delay": "140ms" } as React.CSSProperties}>
            <Button size="xl" variant="signal" asChild><Link href="/karen">Pick up</Link></Button>
            <Button size="xl" variant="outline" asChild><Link href="/signup">Start free trial</Link></Button>
            <p className="text-muted-foreground w-full text-sm md:w-auto">{TRIAL.calls} free calls, {TRIAL.days} days, no card, work email only.</p>
          </div>
        </div>
        <div className="enter mt-10" style={{ "--enter-delay": "240ms" } as React.CSSProperties}>
          <SampleCall autoStart />
        </div>
      </Section>

      {/* 2. How it works */}
      <Section id="how-it-works" className="border-t">
        <Eyebrow>How it works</Eyebrow>
        <H2>Three steps between a new rep and a booked meeting.</H2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t pt-5">
              <div className="flex items-center justify-between">
                <s.icon className="text-signal size-5" />
                <span className="dial text-muted-foreground text-xs">STEP 0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="text-muted-foreground text-body mt-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 3. The ladder */}
      <Section className="border-t">
        <Eyebrow>Three levels</Eyebrow>
        <H2>It gets harder. That is the point.</H2>
        <div className="mt-10"><Ladder /></div>
        <p className="text-muted-foreground mt-5 max-w-2xl text-sm">Reps are nudged up a level after three calls averaging seven or better. Nothing is locked.</p>
      </Section>

      {/* 4. Boss fights */}
      <BossFights />

      {/* 5. For the manager */}
      <Section>
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <Eyebrow>For the manager</Eyebrow>
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
            <Eyebrow>Grounded in your calls</Eyebrow>
            <H2>Prospects that sound like your market, not like a chatbot.</H2>
            <p className="text-muted-foreground text-body mt-5">
              Upload transcripts from Gong, Chorus or your dialer. 100 Dials extracts how your buyers talk, the objections they actually raise and the phrasing they use, then puts it in the prospect's mouth. The coach grades against your playbook, not a generic one.
            </p>
            <Button className="mt-6" variant="outline" asChild><Link href="/for-enablement">How enablement teams use it</Link></Button>
          </div>
          <div className="stage text-background rounded-2xl p-6 md:p-8">
            <div className="dial text-background/60 mb-4 flex items-center gap-2 text-[11px]"><BookOpen className="size-3.5" /> DIGEST FROM UPLOADED CALLS</div>
            <dl className="divide-y divide-white/10">
              {[
                ["Objection, in their words", "“We already run Samsara on half the trucks.”"],
                ["Tone", "Short answers. Impatient with scripts. Warms up to fuel-cost-per-mile language."],
                ["What booked meetings", "A reason for calling tied to fleet growth in the first twenty seconds."],
              ].map(([k, v]) => (
                <div key={k} className="py-3">
                  <dt className="text-background/60 text-xs">{k}</dt>
                  <dd className="font-display mt-1 text-2xl leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* 7. Founder note */}
      <FounderNote />

      <CtaBand />
    </>
  );
}
