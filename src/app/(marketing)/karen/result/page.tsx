import Link from "next/link";
import { AdsConversion } from "@/components/analytics/ads-conversion";
import { redirect } from "next/navigation";
import { currentDemo } from "@/lib/demo/session";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import { RUBRIC, type RubricKey } from "@/lib/scoring/rubric";
import { Eyebrow, Section } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResultPoller } from "./result-poller";
import { LeaderboardForm } from "./leaderboard-form";
import { EmailStep } from "./email-step";
import { callKaren } from "../actions";
import { ShareButton } from "../share-button";
import { survivedLabel } from "@/lib/demo/share";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site";

export const metadata = { title: "Your call with Karen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function KarenResultPage() {
  const demo = await currentDemo();
  if (!demo) redirect("/karen?error=expired");
  if (demo.status === "created" || demo.status === "dialing") redirect("/karen/call");
  const pending = demo.status === "live" || demo.status === "ended" || demo.status === "scoring";
  // The call button starts without an address. Until the caller gives one, the breakdown stays behind the email step.
  const locked = !demo.email;
  const signup = demo.personal_email || !demo.email ? "/signup" : `/signup?email=${encodeURIComponent(demo.email)}`;
  // Signed in with the same Google account that made the call: the trial is one click away.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const viaGoogle = Boolean(user?.email && demo.email && user.email.toLowerCase() === demo.email);
  const forward = `mailto:?subject=${encodeURIComponent("Cold call practice for the team")}&body=${encodeURIComponent(`I just tried a cold call against an AI prospect on 100 Dials${demo.share_slug ? ` (my scorecard: ${absoluteUrl(`/karen/score/${demo.share_slug}`)})` : ""}. It does this for a whole SDR team, on prospects built from our own accounts. Ten free calls to try it: ${absoluteUrl("/signup")}`)}`;

  return (
    <Section className="pt-14 md:pt-20">
      <ResultPoller pending={pending} />
      {demo.status === "scored" && <AdsConversion kind="karen" id={demo.id} email={demo.email} />}
      <div className="mx-auto max-w-3xl">
        <Eyebrow>Your call with Karen</Eyebrow>
        {pending ? (
          <>
            <h1 className="font-display mt-4 text-5xl text-balance">The coach is reviewing it.</h1>
            <p className="text-muted-foreground mt-4 text-lg">About a minute. The transcript is being pulled, then six skills are scored and your report is written. This page updates itself.</p>
            {locked && <div className="mt-8"><EmailStep pending /></div>}
          </>
        ) : demo.status === "failed" || !demo.score ? (
          <>
            <h1 className="font-display mt-4 text-5xl text-balance">That one did not go through.</h1>
            <p className="text-muted-foreground mt-4 text-lg">{demo.outcome_reason ?? "The call could not be scored. It happens, usually a microphone that was never allowed."} Start a free trial and Karen picks up every time.</p>
            <Button size="lg" className="mt-8" asChild><Link href={signup}>Start a free trial</Link></Button>
          </>
        ) : (
          <>
            <h1 className="font-display mt-4 text-5xl text-balance">{demo.outcome === "meeting_booked" || demo.outcome === "callback" ? "You survived Karen." : "Karen won. Most people lose."}</h1>
            <p className="text-muted-foreground mt-4 text-lg">
              <span className="text-foreground">{OUTCOME_TEXT[demo.outcome ?? ""] ?? "Ended"}.</span> {demo.outcome_reason}
            </p>
            {locked && <div className="mt-8"><EmailStep pending={false} /></div>}
            <div className={cn("mt-10 grid gap-6 md:grid-cols-[auto_1fr] md:items-start", locked && "pointer-events-none select-none blur-sm")} aria-hidden={locked}>
              <div className="bg-card rounded-2xl border p-6 text-center md:w-44">
                <div className="text-muted-foreground text-xs">Overall</div>
                <div className="font-display mt-1 text-6xl">{Number(demo.overall ?? 0).toFixed(1)}</div>
                <div className="text-muted-foreground text-xs">out of 10</div>
              </div>
              <dl className="bg-card divide-y rounded-2xl border px-6">
                {(Object.keys(RUBRIC) as RubricKey[]).map((k) => (
                  <div key={k} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm">{RUBRIC[k].label}</dt>
                    <dd className="tabular font-medium">{demo.score!.dimensions[k].score}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={cn("mt-8 grid gap-6 md:grid-cols-2", locked && "pointer-events-none select-none blur-sm")} aria-hidden={locked}>
              <div>
                <h2 className="font-medium">What worked</h2>
                <ul className="text-muted-foreground mt-2 space-y-2 text-sm">{demo.score.strengths.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h2 className="font-medium">What to fix first</h2>
                <ul className="text-muted-foreground mt-2 space-y-2 text-sm">{demo.score.improvements.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
            {!locked && (
              <>
                <p className="text-muted-foreground mt-8 text-sm">The full report, with the coach's notes on every skill, is in your inbox{demo.email_sent_at ? "" : " shortly"}.</p>
                {demo.method !== "rematch" && (
                  <form action={callKaren} className="bg-card mt-6 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
                    <input type="hidden" name="rematch" value="1" />
                    <div>
                      <div className="font-medium">Read the fix. Then call her again.</div>
                      <div className="text-muted-foreground text-sm">One rematch per person. Same Karen, same three minutes, and the coach scores the difference.</div>
                    </div>
                    <Button type="submit" variant="signal" className="shrink-0">Rematch</Button>
                  </form>
                )}
                {demo.share_slug && (
                  <div className="bg-card mt-8 rounded-2xl border p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">You lasted {survivedLabel(demo.duration_seconds)}. Tell someone.</div>
                        <div className="text-muted-foreground text-sm">Your scorecard has a public page. It shows the time, the score and one line from the coach, nothing else.</div>
                      </div>
                      <ShareButton path={`/karen/score/${demo.share_slug}`} survived={survivedLabel(demo.duration_seconds)} score={Number(demo.overall ?? 0)} />
                    </div>
                    <div className="mt-5 border-t pt-5">
                      <div className="mb-3 text-sm font-medium">Put yourself on this month's <Link href="/karen/leaderboard" className="underline underline-offset-4">leaderboard</Link></div>
                      <LeaderboardForm joined={demo.leaderboard_opt_in} name={demo.display_name} />
                    </div>
                  </div>
                )}
                {demo.personal_email ? (
                  <div className="stage text-paper mt-10 flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
                    <div className="space-y-1.5">
                      <div className="font-display text-3xl leading-tight">Your team should see this.</div>
                      <div className="text-paper/75 text-sm">100 Dials does this for a whole SDR team, on prospects built from your own accounts. The note to your manager is written; it links your scorecard and the ten-call trial.</div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button size="lg" variant="signal" asChild><a href={forward}>Forward to my manager</a></Button>
                      <Button size="lg" variant="outline" className="text-paper border-white/30 bg-transparent hover:bg-white/10 hover:text-paper" asChild><Link href={viaGoogle ? "/onboarding" : "/signup"}>Start a trial with my work email</Link></Button>
                    </div>
                  </div>
                ) : (
                  <div className="stage text-paper mt-10 flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
                    <div className="space-y-1.5">
                      {viaGoogle && demo.email && <div className="dial text-paper/60 text-xs">SIGNED IN WITH GOOGLE · {demo.email.toUpperCase()}</div>}
                      <div className="font-display text-3xl leading-tight">{viaGoogle ? `Your trial for ${demo.domain} is one click away.` : "Karen is one of the easy ones."}</div>
                      <div className="text-paper/75 text-sm">Prospects built from your own accounts, three levels, every call scored like this. Ten free calls, no card. Invite your reps when you're ready.</div>
                    </div>
                    <Button size="lg" variant="signal" className="shrink-0" asChild><Link href={viaGoogle ? "/onboarding" : signup}>Start my 10 free calls</Link></Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
