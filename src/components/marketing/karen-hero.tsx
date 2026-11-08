import Link from "next/link";
import { BarChart3, Clock, UserRound, Wallet } from "lucide-react";
import { TRIAL } from "@/lib/billing/plans";
import { starterMonthlyUsd } from "@/lib/billing/founding";
import { formatMoney } from "@/lib/billing/currency";
import { KAREN } from "@/lib/demo/boss";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleMark } from "@/app/(auth)/auth-form";
import { CallKarenSubmit } from "./call-karen-button";
import { TestimonialStrip } from "./testimonial";
import { SALESFORGE, SHOW_TESTIMONIAL_STRIP } from "@/content/testimonials";
import { callKaren } from "@/app/(marketing)/karen/actions";

function points(price: string) {
  return [
    { icon: Clock, text: "First call in under 2 minutes" },
    { icon: BarChart3, text: "A score after every call, plus the one thing to fix next" },
    { icon: UserRound, text: "Build AI prospects from the companies you really sell to" },
    // Read from the same config as /pricing, so it follows founding pricing and the list price after it.
    { icon: Wallet, text: `${price} a rep per month. One seat is fine.` },
  ];
}

/**
 * Hero A: the category in the headline, and Karen as the first thing to do. On a phone the card follows the
 * headline and the details come after it; on a wide screen the card sits beside both.
 */
export async function KarenHero() {
  const initials = KAREN.name.split(" ").map((w) => w[0]).join("");
  const POINTS = points(formatMoney(await starterMonthlyUsd(), "usd"));
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-10 pb-14 md:pt-16 md:pb-20" data-hero="a">
      <div className="grid items-center gap-x-16 gap-y-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="enter space-y-5 lg:col-start-1 lg:row-start-1 lg:self-end" style={{ "--enter-delay": "0ms" } as React.CSSProperties}>
          <p className="text-muted-foreground text-sm font-medium">AI cold call practice for SDR teams</p>
          <h1 className="font-display text-[2.75rem] leading-[1] text-balance md:text-[4.25rem] xl:text-[4.75rem]">Practice cold calls on AI, not on your real leads.</h1>
          <p className="font-display max-w-[34ch] text-xl leading-snug text-foreground/85 md:text-[1.7rem]">Every real lead costs time and money to reach. New reps waste dozens of them while they learn. With 100 Dials, they practice on AI prospects that talk back first.</p>
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
          <form action={callKaren}>
            <CallKarenSubmit className="focus-visible:ring-paper/50" />
          </form>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value="/onboarding" />
            <button type="submit" aria-label="Start free trial with Google" className="text-paper focus-visible:ring-paper/40 flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/20 text-[15px] font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-[3px]">
              <span className="grid size-5 place-items-center rounded-full bg-white"><GoogleMark /></span>
              Start free trial with Google
            </button>
          </form>
          <p className="text-paper/60 text-xs leading-relaxed">No email needed to start. Allow your mic and Karen picks up. After the call, tell us where to send your score. One call per person. We record it so we can score it.</p>
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
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline">Or start the free team trial →</Link>
            <p className="text-muted-foreground text-sm">{TRIAL.calls} free calls · {TRIAL.days} days · no card</p>
          </div>
          {SHOW_TESTIMONIAL_STRIP && <TestimonialStrip t={SALESFORGE} className="border-t pt-5" />}
        </div>
      </div>
    </section>
  );
}
