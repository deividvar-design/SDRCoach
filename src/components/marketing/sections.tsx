import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PROOF } from "@/content/proof";
import { TRIAL } from "@/lib/billing/plans";

export function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mx-auto w-full max-w-6xl px-6 py-11 md:py-16", className)}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-muted-foreground text-xs", className)}>{children}</p>;
}

export function H2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("font-display mt-3 text-4xl leading-[1.05] text-balance md:text-6xl", className)}>{children}</h2>;
}

export function ProofSection() {
  return (
    <Section className="border-t">
      <div>
        <Eyebrow>{PROOF.quotes.length > 0 ? "Results" : "What every call leaves behind"}</Eyebrow>
        <H2>Numbers a manager can act on, after every dial.</H2>
      </div>
      <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
        {PROOF.stats.map((s) => (
          <li key={s.label} className="border-t pt-5">
            <div className="font-display text-6xl leading-none md:text-7xl">{s.value}</div>
            <div className="mt-3 font-medium">{s.label}</div>
            <p className="text-muted-foreground mt-1 text-sm">{s.detail}</p>
          </li>
        ))}
      </ul>
      {PROOF.quotes.length > 0 && (
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {PROOF.quotes.map((q) => (
          <figure key={q.quote} className="flex flex-col rounded-2xl border p-6">
            <blockquote className="font-display flex-1 text-2xl leading-snug">“{q.quote}”</blockquote>
            <figcaption className="text-muted-foreground mt-5 text-sm">
              <div className="text-foreground font-medium">{q.name}</div>
              {q.company}
            </figcaption>
          </figure>
        ))}
      </div>
      )}
    </Section>
  );
}

export function CtaBand({ title = "Ten free calls. Then decide.", body = "Work email, no card. Your first prospect picks up in under two minutes." }: { title?: string; body?: string }) {
  return (
    <Section>
      <div className="stage text-background rounded-3xl px-8 py-14 text-center md:px-16">
        <h2 className="font-display text-5xl text-balance md:text-6xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-md text-balance opacity-80">{body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="signal" asChild><Link href="/signup">Start free trial</Link></Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" asChild><Link href="/pricing">See pricing</Link></Button>
        </div>
        <p className="mt-4 text-xs opacity-60">{TRIAL.calls} calls, {TRIAL.days} days, work email only</p>
      </div>
    </Section>
  );
}
