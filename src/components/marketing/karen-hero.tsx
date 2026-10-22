import Link from "next/link";
import { BarChart3, Clock, UserRound } from "lucide-react";
import { TRIAL } from "@/lib/billing/plans";
import { KAREN } from "@/lib/demo/boss";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleMark } from "@/app/(auth)/auth-form";
import { KarenQuickForm } from "./karen-quick-form";

const POINTS = [
  { icon: Clock, text: "First call in under 2 minutes" },
  { icon: BarChart3, text: "Every call scored on six skills, with the one thing to fix" },
  { icon: UserRound, text: "Prospects built from the accounts your reps call this quarter" },
];

/**
 * Hero A: the category in the headline, and Karen as the first thing to do. On a phone the card follows the
 * headline and the details come after it; on a wide screen the card sits beside both.
 */
export function KarenHero() {
  const initials = KAREN.name.split(" ").map((w) => w[0]).join("");
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-10 pb-14 md:pt-16 md:pb-20" data-hero="a">
      <div className="grid items-center gap-x-16 gap-y-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="enter space-y-5 lg:col-start-1 lg:row-start-1 lg:self-end" style={{ "--enter-delay": "0ms" } as React.CSSProperties}>
          <h1 className="font-display text-[2.75rem] leading-[1] text-balance md:text-[4.25rem] xl:text-[4.75rem]">AI cold call practice for new SDRs.</h1>
          <p className="font-display max-w-[34ch] text-xl leading-snug text-[#3b3430] md:text-[1.7rem]">Reps dial AI prospects built from your target accounts and make their worst calls here, not on your pipeline.</p>
        </div>

        <section aria-label="Free call with Karen" className="enter stage text-paper flex flex-col gap-5 rounded-3xl p-5 shadow-[0_30px_60px_-30px_rgba(26,21,18,0.45)] md:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1" style={{ "--enter-delay": "120ms" } as React.CSSProperties}>
          <span className="dial text-paper/65 text-xs">FREE · 3 MINUTES · SCORED</span>
          <div className="flex items-center gap-3.5">
            <span className="bg-paper text-ink grid size-12 shrink-0 place-items-center rounded-full font-medium">{initials}</span>
            <div>
              <div className="font-display text-2xl leading-tight">{KAREN.name}</div>
              <div className="text-paper/65 text-sm">{KAREN.title}, {KAREN.company}</div>
            </div>
          </div>
          <p className="rounded-2xl bg-white/[0.07] px-4 py-3.5 text-[15px] leading-relaxed">“{KAREN.objections[0]}”</p>
          <div className="border-t border-white/10" />
          <h2 className="font-display text-3xl leading-tight">Can you survive Karen?</h2>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value="/karen/start" />
            <button type="submit" className="bg-signal text-signal-foreground focus-visible:ring-paper/50 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl text-[17px] font-medium outline-none transition-[filter] hover:brightness-105 focus-visible:ring-[3px]">
              <span className="grid size-6 place-items-center rounded-full bg-white"><GoogleMark /></span>
              Call Karen with Google
            </button>
          </form>
          <div className="text-paper/60 flex items-center gap-3 text-[13px]">
            <span className="h-px flex-1 bg-white/15" />
            or with email
            <span className="h-px flex-1 bg-white/15" />
          </div>
          <KarenQuickForm />
          <p className="text-paper/60 text-xs leading-relaxed">Any Google account works. One call per person. The call is recorded and scored, and your report arrives by email.</p>
        </section>

        <div className="enter space-y-6 lg:col-start-1 lg:row-start-2 lg:self-start" style={{ "--enter-delay": "60ms" } as React.CSSProperties}>
          <ul className="space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <Icon className="text-signal-ink size-5 shrink-0" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
          <div className="space-y-1">
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline">Skip to the {TRIAL.calls}-call team trial →</Link>
            <p className="text-muted-foreground text-sm">{TRIAL.calls} free calls · {TRIAL.days} days access · no credit card</p>
          </div>
        </div>
      </div>
    </section>
  );
}
