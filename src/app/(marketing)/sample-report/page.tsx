import { pageMetadata } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/stat-tile";
import { DimensionBars } from "@/components/report/dimension-bars";
import { CtaLink } from "@/components/analytics/cta-link";
import { Eyebrow, Section } from "@/components/marketing/sections";
import { OBJECTIONS } from "@/lib/scoring/rubric";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import { formatDuration } from "@/lib/utils";
import { SAMPLE_REPORT as r } from "@/content/sample-report";

export const metadata = pageMetadata({
  title: "What a scored call looks like",
  description: "One cold call against Karen, scored the way every call inside 100 Dials is: six skills out of ten with the rationale quoting the rep, the objections tagged, and the coach's notes on what to fix first.",
  path: "/sample-report",
  card: ["page", "sample-report"],
});

const HANDLED: Record<"handled" | "partial" | "missed", { label: string; className: string }> = {
  handled: { label: "Handled", className: "text-success" },
  partial: { label: "Partly", className: "text-warning" },
  missed: { label: "Missed", className: "text-destructive" },
};

/** The report a rep gets after a call, on a sample call so a visitor can see what the coach hands back before making one. */
export default function SampleReportPage() {
  const m = r.metrics;
  return (
    <>
      <Section className="pt-14 md:pt-20">
        <Eyebrow>Sample report</Eyebrow>
        <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">What a scored call looks like.</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
          {r.rep} from {r.company} called {r.prospect.name}, {r.prospect.title} at {r.prospect.company}, and lasted {formatDuration(r.durationSeconds)}. This is the report that came back, laid out the way every rep sees their own. A scripted sample, scored with the same rubric.
        </p>
      </Section>

      <Section className="space-y-6 pt-0 md:pt-0">
        <section className="bg-card paper-grain grid gap-6 rounded-2xl border p-6 md:grid-cols-[minmax(0,260px)_1fr] md:gap-10 md:p-8">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="text-muted-foreground mb-3 text-xs">Overall</div>
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-7xl leading-none font-semibold tracking-tight">{r.overall.toFixed(1)}</span>
                <span className="text-muted-foreground text-lg">/ 10</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-2 text-xs">The prospect decided</div>
              <Badge variant="destructive">{OUTCOME_TEXT[r.outcome]}</Badge>
              <p className="text-muted-foreground mt-2 text-sm italic">“{r.outcomeReason}”</p>
            </div>
          </div>
          <div className="md:border-l md:pl-10">
            <div className="text-muted-foreground mb-2 text-xs">Coach</div>
            <p className="font-display max-w-prose text-lg leading-relaxed text-pretty md:text-xl">{r.coachSummary}</p>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatTile label="Call length" value={formatDuration(r.durationSeconds)} hint="Short. Enough for a reason and one objection." />
          <StatTile label="Rep talked" value={`${Math.round(m.rep_talk_ratio * 100)}%`} hint="In the 40 to 60% sweet spot" />
          <StatTile label="Longest monologue" value={m.longest_rep_monologue_secs} unit="sec" hint="Kept it tight" />
          <StatTile label="Questions asked" value={m.rep_questions} hint="Good curiosity" />
          <StatTile label="Filler words" value={m.filler_words} hint="Clean delivery" />
          <StatTile label="First objection" value={m.first_objection_secs ?? "-"} unit="sec" hint="Early. The opener invited it." />
          <StatTile label="Interruptions" value={m.interruptions_by_rep} hint="Once or twice, watch it" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section className="bg-card flex flex-col gap-6 rounded-2xl border p-6">
            <div>
              <h2 className="text-warning mb-3 font-medium">Next time</h2>
              <ol className="space-y-3">
                {r.improvements.map((s) => (
                  <li key={s} className="flex gap-3 text-sm leading-relaxed">
                    <span className="text-warning mt-2 size-1.5 shrink-0 rounded-full bg-current" />
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="border-t pt-5">
              <h2 className="text-success mb-3 font-medium">What worked</h2>
              <ul className="space-y-3">
                {r.strengths.map((s) => (
                  <li key={s} className="flex gap-3 text-sm leading-relaxed">
                    <span className="text-success mt-2 size-1.5 shrink-0 rounded-full bg-current" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t pt-5">
              <h2 className="mb-3 font-medium">Objections, tagged</h2>
              <ul className="space-y-3">
                {r.objections.map((o) => (
                  <li key={o.t_ms} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{OBJECTIONS[o.kind].label}</span>
                      <span className={`shrink-0 text-xs ${HANDLED[o.handled].className}`}>{HANDLED[o.handled].label} · {formatDuration(Math.floor(o.t_ms / 1000))}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">“{o.quote}”</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-card rounded-2xl border p-6">
            <h2 className="mb-5 font-medium">Breakdown</h2>
            <DimensionBars dimensions={r.dimensions} />
          </section>
        </div>

        <section className="bg-card rounded-2xl border">
          <div className="border-b px-6 py-4"><h2 className="font-medium">Transcript</h2></div>
          <div className="space-y-5 p-6">
            {r.transcript.map((t, i) => (
              <div key={i} className={`max-w-3xl ${t.role === "rep" ? "" : "pl-5"}`}>
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
                  <span>{t.role === "rep" ? r.rep : r.prospect.name.split(" ")[0]}</span>
                  <span className="tabular">{formatDuration(Math.floor((t.t_start_ms ?? 0) / 1000))}</span>
                </div>
                <p className={`text-sm leading-relaxed ${t.role === "prospect" ? "text-muted-foreground" : ""}`}>{t.text}</p>
              </div>
            ))}
          </div>
        </section>
      </Section>

      <Section>
        <div className="stage text-paper rounded-3xl px-8 py-14 text-center md:px-16">
          <h2 className="font-display text-5xl text-balance md:text-6xl">Your call, scored like this.</h2>
          <p className="mx-auto mt-4 max-w-md text-balance opacity-80">Three minutes against Karen, no account, no card. The six skills, the objections and the coach's notes land a minute after she hangs up.</p>
          <Button size="lg" variant="signal" className="mt-8" asChild><CtaLink ctaId="sample_report_karen" href="/karen?from=/sample-report">Get your own report: call Karen</CtaLink></Button>
        </div>
      </Section>
    </>
  );
}
