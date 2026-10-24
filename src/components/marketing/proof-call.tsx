import Link from "next/link";
import { RUBRIC, type RubricKey } from "@/lib/scoring/rubric";

/**
 * What the coach hands back after a call, shown before anyone makes one. A sample call against Karen, scored on the
 * same six skills as every call inside the product, and labelled as a sample: no invented customer, no invented quote.
 */
const SCORES: Record<RubricKey, number> = { opener: 7, reason_for_call: 8, discovery: 6, objection_handling: 7, value_prop: 5, close: 6 };
const OVERALL = 6.6;

const TURNS = [
  { who: "Karen", at: "0:00", text: "This had better be important." },
  { who: "Sam", at: "0:03", text: "Karen, Sam from Northwind. I know I'm an interruption. Twenty seconds on why I called, then you decide?" },
  { who: "Karen", at: "0:09", text: "Who gave you this number?" },
  { who: "Sam", at: "0:11", text: "Your supplier page lists you for vendor onboarding. Three of your contracts renew in Q1, and that renewal crunch is the only reason I'm calling." },
];

const WORKED = "Asked permission with a time box at 0:03 instead of “How are you today?”, which is what earned the next twenty seconds.";
const FIX = "Value never got concrete. “We help with renewals” is a category, not an outcome. Name one number a procurement lead would recognise, then ask for Thursday.";
const COACH = "You survived two minutes against a prospect who ends most calls in ten seconds. The opener and the reason for the call carried it. You lost her at the value line: she asked what you actually do, and the answer was a description, not a result. Fix that one sentence and this is a callback.";

export function ProofCall() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
      <div className="stage text-paper flex flex-col rounded-3xl p-6 md:p-7">
        <div className="flex items-center justify-between">
          <span className="dial text-paper/65 text-xs">SAMPLE CALL · KAREN · 2:12</span>
          <span className="dial text-paper/65 text-xs">HUNG UP</span>
        </div>
        <ol className="mt-6 space-y-4">
          {TURNS.map((t) => (
            <li key={t.at} className={t.who === "Karen" ? "" : "pl-6"}>
              <div className="text-paper/55 flex gap-2 text-xs"><span>{t.who}</span><span>{t.at}</span></div>
              <p className={t.who === "Karen" ? "mt-1 text-[15px] leading-relaxed" : "text-paper/85 mt-1 text-[15px] leading-relaxed"}>“{t.text}”</p>
            </li>
          ))}
        </ol>
        <p className="text-paper/55 mt-auto pt-6 text-xs">A scripted sample. The calls inside the product are live, with a prospect who talks back.</p>
      </div>

      <div className="bg-card rounded-3xl border p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-muted-foreground text-xs">Scorecard</div>
            <div className="font-display mt-1 text-2xl leading-tight">Six skills, one thing to fix.</div>
          </div>
          <div className="text-right">
            <div className="font-display text-5xl leading-none">{OVERALL.toFixed(1)}</div>
            <div className="text-muted-foreground text-xs">out of 10</div>
          </div>
        </div>
        <dl className="mt-6 space-y-3">
          {(Object.keys(RUBRIC) as RubricKey[]).map((k) => (
            <div key={k} className="grid grid-cols-[9rem_1fr_2ch] items-center gap-3 text-sm">
              <dt>{RUBRIC[k].label}</dt>
              <dd className="bg-muted h-2 overflow-hidden rounded-full"><div className="bg-signal h-full rounded-full" style={{ width: `${SCORES[k] * 10}%` }} /></dd>
              <dd className="tabular text-right font-medium">{SCORES[k]}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium">What worked</div>
            <p className="text-muted-foreground mt-1.5 text-sm">{WORKED}</p>
          </div>
          <div>
            <div className="text-sm font-medium">Fix this first</div>
            <p className="text-muted-foreground mt-1.5 text-sm">{FIX}</p>
          </div>
        </div>
        <blockquote className="mt-6 border-l-2 pl-4 text-sm leading-relaxed">{COACH}</blockquote>
        <p className="text-muted-foreground mt-6 text-sm">
          Every call a rep makes comes back like this, with the rationale quoting their own words. <Link href="/karen" className="text-foreground underline underline-offset-4">Call Karen</Link> and get yours in three minutes.
        </p>
      </div>
    </div>
  );
}
