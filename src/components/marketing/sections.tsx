import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PROOF } from "@/content/proof";
import { TRIAL } from "@/lib/billing/plans";

export function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mx-auto w-full max-w-6xl px-6 py-16 md:py-24", className)}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">{children}</p>;
}

export function H2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("font-display mt-3 text-4xl text-balance md:text-5xl", className)}>{children}</h2>;
}

export function ProofSection() {
  return (
    <Section className="border-t">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Results</Eyebrow>
          <H2>What changes after twenty practice calls.</H2>
        </div>
        {PROOF.placeholder && <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs">Illustrative results from pilot teams</span>}
      </div>
      <dl className="mt-10 grid gap-6 md:grid-cols-3">
        {PROOF.stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border p-6">
            <dd className="font-mono text-5xl font-medium tabular">{s.value}</dd>
            <dt className="mt-2 font-medium">{s.label}</dt>
            <p className="text-muted-foreground mt-1 text-sm">{s.detail}</p>
          </div>
        ))}
      </dl>
      {PROOF.quotes.length > 0 && (
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {PROOF.quotes.map((q) => (
          <figure key={q.quote} className="flex flex-col rounded-2xl border p-6">
            <blockquote className="font-display flex-1 text-xl leading-snug">“{q.quote}”</blockquote>
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
      <div className="bg-primary text-primary-foreground paper-grain rounded-3xl px-8 py-14 text-center md:px-16">
        <h2 className="font-display text-4xl text-balance md:text-5xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-md text-balance opacity-80">{body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="signal" asChild><Link href="/signup">Start free trial</Link></Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" asChild><Link href="/pricing">See pricing</Link></Button>
        </div>
        <p className="mt-4 text-xs opacity-60">{TRIAL.calls} calls · {TRIAL.days} days · work email only</p>
      </div>
    </Section>
  );
}
