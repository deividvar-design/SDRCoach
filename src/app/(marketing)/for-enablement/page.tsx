import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeatureRow } from "@/components/marketing/feature-row";
import { CtaBand, Eyebrow, H2, ProofSection, Section } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "For sales enablement",
  description: "Turn your call library into a training ground. Ground AI prospects in your real transcripts, grade every rep on one rubric, and measure skill week over week.",
  alternates: { canonical: "/for-enablement" },
};

export default function ForEnablementPage() {
  return (
    <>
      <Section className="pt-14 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>For sales enablement</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Your call library is a training ground. Use it.</h1>
          <p className="text-muted-foreground mt-6 text-lg text-balance">
            You have thousands of recorded calls and one rubric in a slide deck. SDRCoach turns the recordings into prospects that talk like your market and turns the rubric into a score on every practice call, for every rep, every week.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="signal" asChild><Link href="/signup">Start free trial <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/trust">How we handle your data</Link></Button>
          </div>
        </div>
      </Section>

      <Section className="space-y-24 border-t">
        <FeatureRow
          eyebrow="Grounding"
          title="Upload a quarter of calls. Prospects start sounding like your buyers."
          body={<><p>Drop in CSV exports from Gong, Chorus, Fireflies or your dialer. SDRCoach extracts the objections your market actually raises, in the phrasing it uses, plus tone and the moves that booked meetings.</p><p>That digest, never the raw transcript, is injected into every persona and into the grader. Your reps practise against your market's real pushback.</p></>}
          image="/screens/knowledge.png"
          alt="Knowledge page with uploaded transcripts and their digest status"
        />
        <FeatureRow
          flip
          eyebrow="One rubric"
          title="Every rep graded the same way, on evidence."
          body={<><p>Six dimensions anchored in published cold-call research and weighted toward what books meetings: reason for call, objection handling and the close carry the most.</p><p>Each score comes with a rationale quoting the rep's own words, plus deterministic stats the model cannot fudge: talk ratio, longest monologue, questions asked, filler words, time to first objection.</p></>}
          image="/screens/report.png"
          alt="Post-call report with overall score, coach summary, stats and dimension breakdown"
        />
        <FeatureRow
          eyebrow="Measurement"
          title="Skill over time, per rep and per dimension."
          body={<><p>Trend lines per rep. Weakest dimension highlighted. Levels recommended on evidence, three calls averaging seven or better, never locked. A team heatmap and an objection league table on the coaching view. CSV export per rep for the QBR instead of anecdotes.</p></>}
          image="/screens/rep.png"
          alt="Per-rep view with trend chart and dimension averages"
        />
      </Section>

      <Section className="border-t">
        <Eyebrow>Built for programs, not demos</Eyebrow>
        <H2>What enablement teams get that a chatbot doesn't.</H2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Real voice, real interruptions", "Full-duplex voice. The prospect cuts in when a rep monologues, the same as a buyer would."],
            ["Prospect-decided outcomes", "Booked, callback, info requested, rejected or hung up, judged from the prospect's own closing words. No self-reporting."],
            ["Your targets, your levels", "Real accounts alongside six built-in personas. Three difficulty levels with distinct behavioural briefs."],
            ["Recordings and transcripts", "Every call is replayable with key moments pinned to the transcript. Delete a call and it is gone, recording included."],
            ["Objections, tagged", "Twelve objection types tagged on every reviewed call with how the rep handled them, so 'send me an email' has a number, not a feeling."],
            ["Roles and tenancy", "Owners, managers and reps. Reps see their own calls, or the whole team's when you turn that on. Managers see everything. Enforced in the database."],
            ["No training on your data", "Your transcripts ground your prospects and nothing else. Delete a source and its digest goes with it."],
          ].map(([t, b]) => (
            <li key={t} className="bg-card rounded-2xl border p-6">
              <h3 className="font-medium">{t}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{b}</p>
            </li>
          ))}
        </ul>
      </Section>

      <ProofSection />
      <CtaBand title="Ground a prospect in your calls this afternoon." body="Ten free calls. Upload transcripts during the trial. Work email only." />
    </>
  );
}
