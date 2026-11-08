import Link from "next/link";
import { Glow } from "@/components/marketing/glow";
import { pageMetadata } from "@/lib/seo";
import { TRIAL } from "@/lib/billing/plans";
import { KAREN } from "@/lib/demo/boss";
import { KAREN_BRIEF } from "@/content/karen-brief";
import { Eyebrow, H2, Section } from "@/components/marketing/sections";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { CallKarenSubmit } from "@/components/marketing/call-karen-button";
import { callKaren } from "./actions";
import { DEMO_ERRORS } from "@/lib/demo/start";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleMark } from "@/app/(auth)/auth-form";
import { getObjectionPage } from "@/lib/objections";
import { cleanObjection, cleanSourcePath } from "@/lib/demo/source";
import { RememberKarenSource } from "./remember-source";
import { PrefetchCall } from "./prefetch-call";

export const metadata = pageMetadata({
  title: "Practice cold calls free: can you survive Karen?",
  description: "Practice a cold call for free against Karen Whitlock, Head of Procurement, the rudest AI prospect we could build. Three minutes, no account, a scored report after.",
  path: "/karen",
  card: ["page", "karen"],
});

const FAQ: [string, string][] = [
  ["Is this really free?", `Yes. One three-minute call with Karen. No account, no card, no form. After the call, give us an email and we'll send your report. Want more calls, or prospects built from your own target companies? Start the ${TRIAL.days}-day free trial.`],
  ["Who is Karen?", "An AI prospect. She runs procurement, has 22 years in the job, and you just interrupted her. She's our hardest prospect, made even harder. She cuts you off, asks who you are, brings up the supplier she already uses, and tries to hang up."],
  ["What does the report score?", "Six skills, each out of 10: opener, reason for calling, discovery, objection handling, value, and close. Each score comes with a quote from what you said. Nobody books Karen. Staying calm and asking one good question is the win."],
  ["Can my whole team try it?", "Yes. Everyone can call her once with their own email, and the leaderboard shows how they did. Want your team to practice every day on prospects built from your accounts? Start a free trial and invite them."],
];

export default async function KarenPage({ searchParams }: PageProps<"/karen">) {
  const { error, busy, from, objection } = await searchParams;
  const notice = busy ? "Karen's taken all the calls she'll take today. Come back tomorrow, or start a free trial, where she picks up every time." : typeof error === "string" ? DEMO_ERRORS[error] ?? null : null;
  // Tracking only: which page sent the caller and which objection card they clicked. The call itself does not change.
  const source = { source_path: cleanSourcePath(from), objection: cleanObjection(objection) };
  const objectionPage = source.objection ? getObjectionPage(source.objection) : null;
  if (!objectionPage) source.objection = null;
  const sourceQuery = new URLSearchParams({ ...(source.source_path ? { from: source.source_path } : {}), ...(source.objection ? { objection: source.objection } : {}) }).toString();
  return (
    <>
      <RememberKarenSource from={source.source_path} objection={source.objection} />
      <PrefetchCall />
      <JsonLd data={faqLd(FAQ.map(([q, a]) => ({ q, a })))} />
      <Glow>
      <Section className="pt-14 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <h1 className="font-display text-6xl leading-[0.95] text-balance md:text-[6rem]">Can you survive Karen?</h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg">No account. Three minutes. One try.{" "}
              {KAREN.name} runs procurement at {KAREN.company} and has done the job for 22 years. She doesn&apos;t take cold calls. She&apos;ll ask for your manager&apos;s name, and she&apos;s writing it down.
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
              Karen is an AI prospect, like the ones reps call inside 100 Dials every day, only much harder. After the call, our coach scores six skills, from your opener to your close, and emails you the report. Nobody expects you to book her. Staying calm is the win.
            </p>
            <p className="text-muted-foreground mt-4 max-w-xl">
              See <Link href="/karen/leaderboard" className="text-foreground underline underline-offset-4">who lasted longest this month</Link>, or read <Link href="/objections" className="text-foreground underline underline-offset-4">the objections she&apos;ll throw at you</Link> first.
            </p>
          </div>
          <div className="space-y-4">
            {notice && <p className="border-destructive/40 text-destructive rounded-xl border p-4 text-sm">{notice}</p>}
            {objectionPage && (
              <p className="text-muted-foreground text-sm">You came from &lsquo;{objectionPage.phrasings[0] ?? objectionPage.label}&rsquo;. Karen will throw pushbacks like that one at you.</p>
            )}
            <div className="bg-card space-y-4 rounded-2xl border p-6">
              <form action={callKaren}>
                {source.source_path && <input type="hidden" name="from" value={source.source_path} />}
                {source.objection && <input type="hidden" name="objection" value={source.objection} />}
                <CallKarenSubmit />
              </form>
              <p className="text-muted-foreground text-sm">No email needed to start. Allow your mic and Karen picks up. After the call, tell us where to send your score.</p>
              <div className="text-muted-foreground flex items-center gap-3 text-xs"><span className="bg-border h-px flex-1" />or<span className="bg-border h-px flex-1" /></div>
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value={sourceQuery ? `/karen/start?${sourceQuery}` : "/karen/start"} />
                <button type="submit" className="hover:bg-accent focus-visible:ring-ring/50 flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border text-[15px] font-medium outline-none focus-visible:ring-[3px]">
                  <span className="grid size-5 place-items-center rounded-full bg-white"><GoogleMark /></span>
                  Call Karen with Google
                </button>
              </form>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                One call per person, up to three minutes. We record the call so we can score it. See the <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
              </p>
            </div>
            {/* Every caller sells the same made-up product, so nobody dials with nothing to say. It stays on screen during the call. */}
            <div className="rounded-2xl border p-6">
              <div className="text-muted-foreground text-xs">What you&apos;re selling</div>
              <p className="mt-2 text-sm"><span className="font-medium">{KAREN_BRIEF.company}.</span> {KAREN_BRIEF.oneLine}</p>
              <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-4 text-sm">
                {KAREN_BRIEF.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <p className="text-muted-foreground mt-3 text-sm">{KAREN_BRIEF.proof}</p>
              <p className="mt-3 text-sm">Your goal: {KAREN_BRIEF.ask.charAt(0).toLowerCase() + KAREN_BRIEF.ask.slice(1)} This brief stays on screen while you talk.</p>
            </div>
          </div>
        </div>
      </Section>
      </Glow>
      <Section>
        <Eyebrow>Practice cold calls free</Eyebrow>
        <H2>Before you call.</H2>
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
