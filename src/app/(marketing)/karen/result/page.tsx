import Link from "next/link";
import { redirect } from "next/navigation";
import { currentDemo } from "@/lib/demo/session";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import { RUBRIC, type RubricKey } from "@/lib/scoring/rubric";
import { Eyebrow, Section } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { ResultPoller } from "./result-poller";

export const metadata = { title: "Your call with Karen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function KarenResultPage() {
  const demo = await currentDemo();
  if (!demo) redirect("/karen");
  if (demo.status === "created") redirect("/karen/call");
  const pending = demo.status === "live" || demo.status === "ended" || demo.status === "scoring";
  const signup = `/signup?email=${encodeURIComponent(demo.email)}`;

  return (
    <Section className="pt-14 md:pt-20">
      <ResultPoller pending={pending} />
      <div className="mx-auto max-w-3xl">
        <Eyebrow>Your call with Karen</Eyebrow>
        {pending ? (
          <>
            <h1 className="font-display mt-4 text-5xl text-balance">The coach is reviewing it.</h1>
            <p className="text-muted-foreground mt-4 text-lg">About a minute. The transcript is being pulled, then six skills are scored and your report is written. This page updates itself.</p>
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
            <div className="mt-10 grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
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
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="font-medium">What worked</h2>
                <ul className="text-muted-foreground mt-2 space-y-2 text-sm">{demo.score.strengths.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h2 className="font-medium">What to fix first</h2>
                <ul className="text-muted-foreground mt-2 space-y-2 text-sm">{demo.score.improvements.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
            <p className="text-muted-foreground mt-8 text-sm">The full report, with the coach's notes on every skill, is in your inbox{demo.email_sent_at ? "" : " shortly"}.</p>
            <div className="bg-card mt-10 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">Karen is one of the easy ones.</div>
                <div className="text-muted-foreground text-sm">Prospects built from your own targets, three levels, every call scored like this. Ten free calls, no card.</div>
              </div>
              <Button size="lg" asChild><Link href={signup}>Start a free trial</Link></Button>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
