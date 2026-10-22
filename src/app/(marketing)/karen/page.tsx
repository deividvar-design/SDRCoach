import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { KAREN } from "@/lib/demo/boss";
import { Eyebrow, H2, Section } from "@/components/marketing/sections";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { ChallengeForm } from "./challenge-form";
import { DEMO_ERRORS } from "@/lib/demo/start";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleMark } from "@/app/(auth)/auth-form";

export const metadata = pageMetadata({
  title: "Practice cold calls free: can you survive Karen?",
  description: "Practise a cold call free against Karen Whitlock, Head of Procurement, the rudest AI prospect we could build. Three minutes, no account, a scored report after.",
  path: "/karen",
  card: ["page", "karen"],
});

const FAQ: [string, string][] = [
  ["Is this really free?", "Yes. One three-minute cold call against Karen, no account and no card. You give an email so we can send you the scored report. If you want more calls, or a prospect built from your own targets, that is the 14-day trial."],
  ["Who is Karen?", "An AI prospect. Head of Procurement, twenty-two years in the job, interrupted mid-task by your call. She is the hardest level reps practise against inside 100 Dials, turned up a little further. She interrupts, asks who you are, mentions her incumbent and tries to end the call."],
  ["What does the report score?", "The same six skills every 100 Dials call is scored on: opener, reason for call, discovery, objection handling, value proposition and close, each out of ten with the rationale quoting your own words. Nobody books Karen. Staying composed and asking one sharp question is the win."],
  ["Can my whole team try it?", "Each person can take the call once with their own email, and the leaderboard shows how they did. For a team practising daily on prospects built from your accounts, start a trial and invite them."],
];

export default async function KarenPage({ searchParams }: PageProps<"/karen">) {
  const { email, error, busy } = await searchParams;
  const notice = busy ? "Karen has taken all the calls she will take today. Come back tomorrow, or start a free trial, where she picks up every time." : typeof error === "string" ? DEMO_ERRORS[error] ?? null : null;
  return (
    <>
      <JsonLd data={faqLd(FAQ.map(([q, a]) => ({ q, a })))} />
      <Section className="pt-14 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <h1 className="font-display text-6xl leading-[0.95] text-balance md:text-[6rem]">Can you survive Karen?</h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg">No account, three minutes, one shot. 
              {KAREN.name} is {KAREN.title} at {KAREN.company}. Twenty-two years in procurement. She does not take cold calls, she wants your manager's name, and she is making a note of this.
            </p>
            <ul className="mt-8 space-y-3">
              {KAREN.objections.slice(0, 3).map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="bg-signal mt-2 size-1.5 shrink-0 rounded-full" />
                  <span className="text-muted-foreground">“{line}”</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-8 max-w-xl">
              She is an AI prospect, the same kind reps dial inside 100 Dials every day, turned up to eleven. After the call, our coach scores your opener, reason for call, discovery, objection handling, value and close, and emails you the report. Nobody is expected to book her. Staying composed is the win.
            </p>
            <p className="text-muted-foreground mt-4 max-w-xl">
              See <Link href="/karen/leaderboard" className="text-foreground underline underline-offset-4">who lasted longest this month</Link>, or read up on <Link href="/objections" className="text-foreground underline underline-offset-4">the objections she will throw at you</Link> first.
            </p>
          </div>
          <div className="space-y-4">
            {notice && <p className="border-destructive/40 text-destructive rounded-xl border p-4 text-sm">{notice}</p>}
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/karen/start" />
              <button type="submit" className="bg-signal text-signal-foreground focus-visible:ring-ring/50 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl text-[17px] font-medium outline-none transition-[filter] hover:brightness-105 focus-visible:ring-[3px]">
                <span className="grid size-6 place-items-center rounded-full bg-white"><GoogleMark /></span>
                Call Karen with Google
              </button>
            </form>
            <div className="text-muted-foreground flex items-center gap-3 text-xs"><span className="bg-border h-px flex-1" />or with email<span className="bg-border h-px flex-1" /></div>
            <ChallengeForm email={typeof email === "string" ? email : undefined} />
          </div>
        </div>
      </Section>
      <Section>
        <Eyebrow>Practice cold calls free</Eyebrow>
        <H2>What you are signing up for.</H2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-2xl border p-6">
              <dt className="font-medium">{q}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
