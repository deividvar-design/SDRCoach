import type { Metadata } from "next";
import { FeatureRow } from "@/components/marketing/feature-row";
import { CtaBand, Eyebrow, H2, ProofSection, Section } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For sales managers",
  description: "Ramp new SDRs in days, see every rep's weakest skill and the objections the team fumbles, assign practice before the real outreach starts, and get a Monday digest of the floor.",
  alternates: { canonical: "/for-managers" },
};

export default function ForManagersPage() {
  return (
    <>
      <Section className="pt-14 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>For sales managers</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Stop ramping reps on your real pipeline.</h1>
          <p className="text-muted-foreground mt-6 text-lg text-balance">
            A new SDR's first fifty dials are the worst calls your prospects will ever get. Give them fifty fake ones first, score every one, and put them on the phones when the numbers say they're ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="signal" asChild><Link href="/signup">Start free trial</Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/pricing">See pricing</Link></Button>
          </div>
        </div>
      </Section>

      <Section className="space-y-24 border-t">
        <FeatureRow
          eyebrow="Ramp"
          title="Day one to first booked meeting in days, not weeks."
          body={<><p>New hires dial the same targets your team is working this quarter. Level 1 builds the opener and the ask. Level 3 is the real thing: a senior buyer who interrupts, challenges and tries to hang up.</p><p>Every call ends with a score, a transcript and one concrete thing to do differently. Reps run twenty calls in an afternoon. That used to be a month of burned prospects.</p></>}
          image="/screens/call.png"
          alt="The live call screen: prospect card, level badge, timer and live transcript"
        />
        <FeatureRow
          flip
          eyebrow="Visibility"
          title="See every rep's weakest skill and the objections they fumble."
          body={<><p>Six dimensions on every reviewed call, the same rubric for everyone: opener, reason for call, discovery, objection handling, value proposition, close. Weighted the way meetings actually get booked.</p><p>The coaching view puts the whole team on one heatmap, weakest first, and ranks every objection prospects raised by how often it was handled cleanly and who struggles with it. The per-rep view shows the trend and every call underneath.</p></>}
          image="/screens/coaching.png"
          alt="Coaching view: skills by rep heatmap and the most frequent objections"
        />
        <FeatureRow
          eyebrow="Assignments"
          title="Assign the practice before the sequence starts."
          body={<><p>Petram outreach begins Monday? Assign three Level 3 calls against the Petram persona by Friday. Progress fills as calls land. Overdue is visible.</p><p>Reps see it on their dashboard next to their streak and personal best, so it competes with nothing. Leave a note on any call and it lands there too.</p></>}
          image="/screens/team.png"
          alt="Team page with the assignment tool and per-member stats"
        />
        <FeatureRow
          flip
          eyebrow="Momentum"
          title="Streaks, personal bests, a leaderboard the floor can see."
          body={<><p>The loop is call, prospect's verdict, one thing to try, call again. Reviews are one click, so a rep who already knows a call went badly is not forced to sit through the score. Streaks and a weekly board make reps come back on their own.</p><p>Every Monday you get the week in one email: calls, bookings, top rep, weakest skill, most mishandled objection.</p></>}
          image="/screens/dashboard.png"
          alt="Rep dashboard with streak, average score, meetings booked and leaderboard"
        />
      </Section>

      <ProofSection />

      <Section className="border-t">
        <Eyebrow>Questions managers ask</Eyebrow>
        <H2>Straight answers.</H2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            ["Will reps game it?", "They can try. The prospect decides the outcome from its own words, the grader is calibrated so a nine is rare, the prospect brief is server-checked on every call, and you can read every transcript. Gaming it is harder than just getting better."],
            ["How long does setup take?", "Under ten minutes. Create the workspace, describe what you sell, invite reps. Six practice personas are ready before the first invite is accepted, and the dashboard walks you through the rest."],
            ["Does it replace live coaching?", "No. It replaces the fifty calls you had to listen to before you knew what to coach. The report tells you where to spend your twenty minutes."],
            ["What does it cost?", "Per seat with a monthly call allowance. A new rep typically uses twenty to forty calls in their first two weeks and ten a week after that. See pricing for the numbers."],
          ].map(([q, a]) => (
            <div key={q} className="rounded-2xl border p-6">
              <dt className="font-medium">{q}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand title="Put your next hire on the phones a week earlier." />
    </>
  );
}
