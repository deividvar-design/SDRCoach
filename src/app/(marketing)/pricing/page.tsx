import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PlanGrid } from "@/components/billing/plan-grid";
import { TRIAL } from "@/lib/billing/plans";

export const metadata = { title: "Pricing", description: "Simple per-seat pricing with a call allowance. Free trial, no card." };

const FAQ = [
  { q: "What counts as a call?", a: "A practice call that connects to the AI prospect. Failed dials and calls under ten seconds are not counted." },
  { q: "What happens when a rep uses their allowance?", a: "Calls keep working and are billed at the overage rate at the end of the month. Managers can cap overage per team." },
  { q: "Do unused calls roll over?", a: "No. Allowances reset monthly. Annual plans are billed up front with a 20% discount." },
  { q: "Can we use our own call recordings?", a: "Yes, on Team and above. Upload transcripts from Gong, Chorus or your dialer and prospects start sounding like your market within minutes." },
  { q: "Is our data used to train models?", a: "No. Your transcripts and recordings are used only to ground your own team's prospects and grading." },
  { q: "Why work email only?", a: "SDRCoach is built for teams. The trial creates a workspace for your company domain, so one person can start and invite the rest." },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/"><Logo /></Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
          <Button asChild><Link href="/signup">Start free</Link></Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20">
        <section className="py-16 text-center">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">Pricing</p>
          <h1 className="font-display mt-3 text-5xl text-balance md:text-6xl">Cheaper than one burned prospect.</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance">
            Per seat, with a monthly call allowance. Start with {TRIAL.calls} free calls over {TRIAL.days} days, no card, work email required.
          </p>
        </section>

        <PlanGrid marketing />

        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="font-display text-3xl">Questions</h2>
          <dl className="mt-6 divide-y">
            {FAQ.map((f) => (
              <div key={f.q} className="grid gap-2 py-5 md:grid-cols-[1fr_1.6fr]">
                <dt className="font-medium">{f.q}</dt>
                <dd className="text-muted-foreground text-sm">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-6xl px-6 py-8 text-xs">© {new Date().getFullYear()} SDRCoach</footer>
    </div>
  );
}
