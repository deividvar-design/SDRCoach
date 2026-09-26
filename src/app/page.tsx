import Link from "next/link";
import { ArrowRight, Mic, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { LEVEL_LIST } from "@/lib/domain/levels";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start free</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="py-20 md:py-28">
          <p className="text-primary mb-4 text-sm font-medium tracking-wide uppercase">AI cold-call training for SDR teams</p>
          <h1 className="font-display max-w-3xl text-5xl text-balance md:text-7xl">
            Practice the call before it counts.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg text-balance">
            Your reps dial an AI prospect built from your real targets and your real call transcripts. They get a score,
            a coach’s breakdown and a replay in under a minute. Managers see who’s ready to hit the phones.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start free <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 border-t py-16 md:grid-cols-3">
          {[
            { icon: Target, title: "Your targets, imitated", body: "Add the actual accounts and personas your team is calling. The AI prospect speaks their language and raises their objections." },
            { icon: Mic, title: "Real voice, real pressure", body: "Live, interruptible voice calls powered by ElevenLabs. No typing, no pauses, no hiding." },
            { icon: TrendingUp, title: "Coaching that compounds", body: "Every call is scored across opener, discovery, objections and close. Managers track progress per rep." },
          ].map((f) => (
            <div key={f.title} className="space-y-3">
              <f.icon className="text-primary size-5" />
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="border-t py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Three levels. One goal: booked meetings.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {LEVEL_LIST.map((l) => (
              <div key={l.id} className="bg-card rounded-xl border p-6">
                <div className="text-muted-foreground font-mono text-xs">LEVEL {l.level}</div>
                <h3 className="mt-2 text-lg font-medium">{l.name}</h3>
                <p className="text-primary mt-1 text-sm">{l.tagline}</p>
                <p className="text-muted-foreground mt-3 text-sm">{l.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-6xl px-6 py-8 text-xs">© {new Date().getFullYear()} SDRCoach</footer>
    </div>
  );
}
