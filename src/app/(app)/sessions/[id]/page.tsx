import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, RotateCcw } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { LEVELS, LEVEL_LIST } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreReveal } from "@/components/report/score-reveal";
import { ScorePoller } from "@/components/report/score-poller";
import { DimensionBars } from "@/components/report/dimension-bars";
import { StatTile } from "@/components/stat-tile";
import type { CallOutcome } from "@/types/database";

export const metadata = { title: "Call report" };

const OUTCOME_LABEL: Record<CallOutcome, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  meeting_booked: { label: "Meeting booked", variant: "success" },
  callback: { label: "Call back later", variant: "warning" },
  info_sent: { label: "Asked for info", variant: "warning" },
  rejected: { label: "Rejected", variant: "destructive" },
  hung_up: { label: "Hung up", variant: "destructive" },
  incomplete: { label: "Incomplete", variant: "secondary" },
};

export default async function SessionPage({ params, searchParams }: PageProps<"/sessions/[id]">) {
  const [{ id }, { fresh }] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("call_sessions")
    .select("*, targets(id, name, title, company), profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const [{ data: score }, { data: transcript }] = await Promise.all([
    supabase.from("call_scores").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("call_transcripts").select("*").eq("session_id", id).maybeSingle(),
  ]);

  const level = LEVELS[session.difficulty];
  const pending = !score && (session.status === "scoring" || session.status === "ended" || session.status === "live");
  const isOwn = session.user_id === viewer.userId;
  const nextLevel = LEVEL_LIST.find((l) => l.level === level.level + 1);
  const outcome = session.outcome ? OUTCOME_LABEL[session.outcome] : null;
  const m = session.metrics;
  const hasRecording = Boolean(process.env.ELEVENLABS_API_KEY && session.elevenlabs_conversation_id && score);

  return (
    <div className="space-y-8">
      <ScorePoller active={pending} />
      <PageHeader
        eyebrow={`${formatDate(session.created_at)} · ${formatDuration(session.duration_seconds)} · L${level.level} ${level.name}${!isOwn && session.profiles?.full_name ? ` · ${session.profiles.full_name}` : ""}`}
        title={session.targets ? `${session.targets.name}, ${session.targets.company}` : "Call"}
        description={session.targets?.title}
        actions={
          session.targets && isOwn ? (
            <>
              <Button variant="outline" asChild>
                <Link href={`/practice/call?target=${session.targets.id}&difficulty=${session.difficulty}`}>
                  <RotateCcw /> Call again
                </Link>
              </Button>
              {nextLevel && score && score.overall >= 7 && (
                <Button variant="signal" asChild>
                  <Link href={`/practice/call?target=${session.targets.id}&difficulty=${nextLevel.id}`}>
                    <Phone /> Try L{nextLevel.level}
                  </Link>
                </Button>
              )}
            </>
          ) : null
        }
      />

      {pending && (
        <div className="bg-card flex items-center gap-4 rounded-2xl border p-6">
          <span className="bg-signal size-2.5 rounded-full live-pulse" />
          <div>
            <div className="font-medium">Your coach is reviewing the call</div>
            <div className="text-muted-foreground text-sm">Transcript, stats and a scored breakdown land here in about half a minute.</div>
          </div>
        </div>
      )}

      {session.status === "failed" && !score && (
        <div className="bg-card rounded-2xl border p-6">
          <div className="font-medium">This call could not be scored</div>
          <div className="text-muted-foreground mt-1 text-sm">{session.error ?? "Something went wrong."}</div>
        </div>
      )}

      {score && (
        <>
          <section className="bg-card paper-grain grid gap-8 rounded-2xl border p-6 md:grid-cols-[auto_1fr] md:p-8">
            <div>
              <div className="text-muted-foreground mb-3 font-mono text-[11px] tracking-[0.14em] uppercase">Overall</div>
              <ScoreReveal value={score.overall} animate={fresh === "1"} />
              {outcome && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Badge variant={outcome.variant}>{outcome.label}</Badge>
                  {session.outcome_reason && <span className="text-muted-foreground text-sm italic">“{session.outcome_reason}”</span>}
                </div>
              )}
            </div>
            <div className="md:border-l md:pl-8">
              <div className="text-muted-foreground mb-2 font-mono text-[11px] tracking-[0.14em] uppercase">Coach</div>
              <p className="font-display text-xl leading-snug text-balance md:text-2xl">{score.coach_summary}</p>
            </div>
          </section>

          {hasRecording && (
            <section className="bg-card flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center">
              <div className="text-muted-foreground shrink-0 font-mono text-[11px] tracking-[0.14em] uppercase">Recording</div>
              <audio controls preload="none" className="w-full" src={`/api/calls/${session.id}/audio`} />
            </section>
          )}

          {m && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="You talked" value={`${Math.round(m.rep_talk_ratio * 100)}%`} hint={m.rep_talk_ratio > 0.6 ? "Above 60%. Ask more, tell less." : m.rep_talk_ratio < 0.4 ? "Under 40%. You can lead more." : "In the 40–60% sweet spot"} />
              <StatTile label="Longest monologue" value={m.longest_rep_monologue_secs} unit="sec" hint={m.longest_rep_monologue_secs > 35 ? "Over 35s. Buyers tune out." : "Kept it tight"} />
              <StatTile label="Questions asked" value={m.rep_questions} hint={m.rep_questions === 0 ? "None. Discovery never started." : m.rep_questions < 3 ? "A few more would help" : "Good curiosity"} />
              <StatTile label="Filler words" value={m.filler_words} hint={m.filler_words > 8 ? "Slow down between thoughts" : "Clean delivery"} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-6">
              <section className="bg-card rounded-2xl border p-6">
                <h2 className="mb-5 font-medium">Breakdown</h2>
                <DimensionBars dimensions={score.dimensions} />
              </section>
              <div className="grid gap-6 sm:grid-cols-2">
                <section className="bg-card rounded-2xl border p-6">
                  <h2 className="text-success mb-3 text-sm font-medium">What worked</h2>
                  <ul className="text-muted-foreground list-disc space-y-2 pl-4 text-sm">{score.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                </section>
                <section className="bg-card rounded-2xl border p-6">
                  <h2 className="text-warning mb-3 text-sm font-medium">Next time</h2>
                  <ul className="text-muted-foreground list-disc space-y-2 pl-4 text-sm">{score.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
                </section>
              </div>
            </div>

            <section className="bg-card rounded-2xl border">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="font-medium">Transcript</h2>
                {score.moments.length > 0 && <span className="text-muted-foreground text-xs">{score.moments.length} key moments marked</span>}
              </div>
              <div className="max-h-[720px] space-y-5 overflow-y-auto p-6">
                {transcript?.turns.map((t, i) => {
                  const moment = score.moments.find((mo) => typeof t.t_start_ms === "number" && Math.abs(mo.t_ms - t.t_start_ms) < 1500);
                  return (
                    <div key={i} className={t.role === "rep" ? "" : "pl-5"}>
                      <div className="text-muted-foreground mb-1 flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
                        <span>{t.role === "rep" ? (isOwn ? "You" : session.profiles?.full_name ?? "Rep") : session.targets?.name.split(" ")[0] ?? "Prospect"}</span>
                        {typeof t.t_start_ms === "number" && <span className="tabular">{formatDuration(Math.floor(t.t_start_ms / 1000))}</span>}
                        {moment && <Badge variant={moment.kind === "good" ? "success" : "warning"}>{moment.label}</Badge>}
                      </div>
                      <p className={`text-sm leading-relaxed ${t.role === "prospect" ? "text-muted-foreground" : ""}`}>{t.text}</p>
                    </div>
                  );
                })}
                {!transcript?.turns.length && <p className="text-muted-foreground text-sm">No transcript captured.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
