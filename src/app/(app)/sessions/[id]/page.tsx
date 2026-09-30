import Link from "next/link";
import { dateFormatter } from "@/lib/tz";
import { notFound } from "next/navigation";
import { Phone, RotateCcw } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { LEVELS, LEVEL_LIST } from "@/lib/domain/levels";
import { canManage } from "@/lib/domain/roles";
import { createClient } from "@/lib/supabase/server";
import {formatDuration} from "@/lib/utils";
import { moodById } from "@/lib/domain/moods";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreReveal } from "@/components/report/score-reveal";
import { ScorePoller } from "@/components/report/score-poller";
import { DimensionBars } from "@/components/report/dimension-bars";
import { ReviewPrompt } from "@/components/report/review-prompt";
import { Comments } from "@/components/report/comments";
import { DeleteCallButton } from "@/components/report/delete-call";
import { StatTile } from "@/components/stat-tile";
import type { CallOutcome } from "@/types/database";

export const metadata = { title: "Call report" };
// The review action runs the scorer in after(); give it the same budget as the API routes.
export const maxDuration = 120;

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
  const fmtDate = await dateFormatter();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("call_sessions")
    .select("*, targets(id, name, title, company), profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const [{ data: score }, { data: transcript }, { data: commentRows }] = await Promise.all([
    supabase.from("call_scores").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("call_transcripts").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("call_comments").select("id, body, created_at, author_id, profiles!call_comments_author_id_fkey(full_name)").eq("session_id", id).order("created_at"),
  ]);
  const comments = (commentRows ?? []).map((c) => ({ id: c.id, body: c.body, created_at: c.created_at, author_id: c.author_id, author: c.profiles?.full_name ?? "Teammate" }));
  const commentDates = Object.fromEntries(comments.map((c) => [c.id, fmtDate(c.created_at)]));

  const level = LEVELS[session.difficulty];
  const isOwn = session.user_id === viewer.userId;
  const nextLevel = LEVEL_LIST.find((l) => l.level === level.level + 1);
  const outcome = session.outcome ? OUTCOME_LABEL[session.outcome] : null;
  const m = session.metrics;

  const working = session.status === "scoring" || session.status === "ended" || session.status === "live";
  const collected = session.status === "collected";
  const reviewRequested = session.review_requested_at !== null;
  const unscored = !score && (working || collected);
  // Transcript still on its way (no review asked yet) or the coach is scoring (review asked).
  const collecting = unscored && working && !reviewRequested;
  const reviewing = unscored && reviewRequested && session.status !== "failed";
  const noSpeech = unscored && collected && session.outcome === "incomplete" && !session.metrics?.rep_turns;
  const askReview = unscored && !reviewRequested && !noSpeech && (isOwn || canManage(viewer.membership.role));
  const hasRecording = Boolean(process.env.ELEVENLABS_API_KEY && session.elevenlabs_conversation_id && (score || collected));

  return (
    <div className="space-y-8">
      <ScorePoller active={collecting || reviewing} sessionId={session.id} doneMessage={reviewing ? "Your review is ready" : null} />
      <PageHeader
        eyebrow={`${fmtDate(session.created_at)}, ${formatDuration(session.duration_seconds)}, L${level.level} ${level.name}${moodById(session.mood) ? `, ${moodById(session.mood)!.label.toLowerCase()}` : ""}${session.gatekeeper ? ", via gatekeeper" : ""}${!isOwn && session.profiles?.full_name ? `, ${session.profiles.full_name}` : ""}`}
        title={session.targets ? `${session.targets.name}, ${session.targets.company}` : "Call"}
        description={session.targets?.title}
        actions={
          <>
            {canManage(viewer.membership.role) && <DeleteCallButton sessionId={session.id} />}
          {session.targets && isOwn ? (
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
          ) : null}
          </>
        }
      />

      {askReview && <ReviewPrompt sessionId={session.id} skipped={session.review_skipped_at !== null} collecting={working} />}

      {reviewing && (
        <div className="bg-card flex items-center gap-4 rounded-2xl border p-6">
          <span className="bg-signal size-2.5 rounded-full live-pulse" />
          <div>
            <div className="font-medium">Your coach is reviewing the call</div>
            <div className="text-muted-foreground text-sm">A scored breakdown with key moments lands here in about half a minute.</div>
          </div>
        </div>
      )}

      {collecting && !askReview && (
        <div className="bg-card flex items-center gap-4 rounded-2xl border p-6">
          <span className="bg-signal size-2.5 rounded-full live-pulse" />
          <div className="text-muted-foreground text-sm">Fetching the transcript…</div>
        </div>
      )}

      {unscored && collected && !noSpeech && (
        <>
          <section className="bg-card paper-grain grid gap-6 rounded-2xl border p-6 md:grid-cols-[minmax(0,260px)_1fr] md:gap-10 md:p-8">
            <div>
              <div className="text-muted-foreground mb-2 text-xs">The prospect decided</div>
              {outcome ? <Badge variant={outcome.variant}>{outcome.label}</Badge> : <span className="text-muted-foreground text-sm">Not recorded</span>}
              {session.outcome_reason && <p className="text-muted-foreground mt-2 text-sm italic">“{session.outcome_reason}”</p>}
            </div>
            <div className="md:border-l md:pl-10">
              <div className="text-muted-foreground mb-2 text-xs">What happened</div>
              <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">{session.prospect_summary ?? "No summary available for this call."}</p>
            </div>
          </section>
          {m && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatTile label="Call length" value={formatDuration(session.duration_seconds)} />
              <StatTile label="You talked" value={`${Math.round(m.rep_talk_ratio * 100)}%`} />
              <StatTile label="Longest monologue" value={m.longest_rep_monologue_secs} unit="sec" />
              <StatTile label="Questions asked" value={m.rep_questions} />
              <StatTile label="Filler words" value={m.filler_words} />
            </div>
          )}
          <section className="bg-card rounded-2xl border">
            <div className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-medium">Transcript</h2>
              {hasRecording && <audio controls preload="none" className="h-9 w-full sm:max-w-sm" src={`/api/calls/${session.id}/audio`} />}
            </div>
            <div className="max-h-[640px] space-y-5 overflow-y-auto p-6">
              {transcript?.turns.map((t, i) => (
                <div key={i} className={`max-w-3xl ${t.role === "rep" ? "" : "pl-5"}`}>
                  <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
                    <span>{t.role === "rep" ? (isOwn ? "You" : session.profiles?.full_name ?? "Rep") : t.speaker === "gatekeeper" ? "Gatekeeper" : session.targets?.name.split(" ")[0] ?? "Prospect"}</span>
                    {typeof t.t_start_ms === "number" && <span className="tabular">{formatDuration(Math.floor(t.t_start_ms / 1000))}</span>}
                  </div>
                  <p className={`text-sm leading-relaxed ${t.role === "prospect" ? "text-muted-foreground" : ""}`}>{t.text}</p>
                </div>
              ))}
              {!transcript?.turns.length && <p className="text-muted-foreground text-sm">No transcript captured.</p>}
            </div>
          </section>
        </>
      )}

      {noSpeech && (
        <section className="bg-card rounded-2xl border p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={outcome?.variant ?? "secondary"}>{outcome?.label ?? "Incomplete"}</Badge>
            <span className="font-medium">This call was not scored</span>
          </div>
          {session.outcome_reason && <p className="text-muted-foreground mt-2 text-sm">{session.outcome_reason}</p>}
          {transcript?.turns.length ? (
            <div className="mt-5 space-y-4 border-t pt-5">
              {transcript.turns.map((t, i) => (
                <div key={i} className={t.role === "rep" ? "" : "pl-5"}>
                  <div className="text-muted-foreground mb-1 text-[11px]">{t.role === "rep" ? "You" : session.targets?.name.split(" ")[0] ?? "Prospect"}</div>
                  <p className={`text-sm leading-relaxed ${t.role === "prospect" ? "text-muted-foreground" : ""}`}>{t.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {session.status === "failed" && !score && (
        <div className="bg-card flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">This call could not be processed</div>
            <div className="text-muted-foreground mt-1 text-sm">{session.error ?? "Something went wrong."}</div>
          </div>
          {(isOwn || canManage(viewer.membership.role)) && session.finalize_attempts < 5 && session.elevenlabs_conversation_id && <ReviewPrompt sessionId={session.id} skipped={false} collecting={false} variant="retry" />}
        </div>
      )}
      {collected && !score && session.error?.startsWith("Scoring failed") && reviewRequested && (
        <p className="text-muted-foreground text-sm">The last scoring attempt failed and will be retried automatically. {session.finalize_attempts >= 5 ? "It has now been retried enough times; ask your manager to look at it." : ""}</p>
      )}

      {score && (
        <>
          <section className="bg-card paper-grain grid gap-6 rounded-2xl border p-6 md:grid-cols-[minmax(0,260px)_1fr] md:gap-10 md:p-8">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="text-muted-foreground mb-3 text-xs">Overall</div>
                <ScoreReveal value={score.overall} animate={fresh === "1"} />
              </div>
              {outcome && (
                <div>
                  <div className="text-muted-foreground mb-2 text-xs">The prospect decided</div>
                  <Badge variant={outcome.variant}>{outcome.label}</Badge>
                  {session.outcome_reason && <p className="text-muted-foreground mt-2 text-sm italic">“{session.outcome_reason}”</p>}
                </div>
              )}
            </div>
            <div className="md:border-l md:pl-10">
              <div className="text-muted-foreground mb-2 text-xs">Coach</div>
              <p className="font-display max-w-prose text-lg leading-relaxed text-pretty md:text-xl">{score.coach_summary}</p>
            </div>
          </section>

          {m && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <StatTile label="Call length" value={formatDuration(session.duration_seconds)} hint={(session.duration_seconds ?? 0) < 60 ? "Under a minute. The opener didn't land." : (session.duration_seconds ?? 0) < 180 ? "Short. Enough for a reason and one objection." : "Real conversation length"} />
              <StatTile label="You talked" value={`${Math.round(m.rep_talk_ratio * 100)}%`} hint={m.rep_talk_ratio > 0.6 ? "Above 60%. Ask more, tell less." : m.rep_talk_ratio < 0.4 ? "Under 40%. You can lead more." : "In the 40–60% sweet spot"} />
              <StatTile label="Longest monologue" value={m.longest_rep_monologue_secs} unit="sec" hint={m.longest_rep_monologue_secs > 35 ? "Over 35s. Buyers tune out." : "Kept it tight"} />
              <StatTile label="Questions asked" value={m.rep_questions} hint={m.rep_questions === 0 ? "None. Discovery never started." : m.rep_questions < 3 ? "A few more would help" : "Good curiosity"} />
              <StatTile label="Filler words" value={m.filler_words} hint={m.filler_words > 8 ? "Slow down between thoughts" : "Clean delivery"} />
              <StatTile label="First objection" value={m.first_objection_secs ?? "—"} unit={m.first_objection_secs != null ? "sec" : undefined} hint={m.first_objection_secs == null ? "None raised" : m.first_objection_secs < 20 ? "Early. The opener invited it." : "Earned some room first"} />
              <StatTile label="Interruptions" value={m.interruptions_by_rep} hint={m.interruptions_by_rep === 0 ? "Let them finish every time" : m.interruptions_by_rep > 2 ? "Talking over the buyer" : "Once or twice, watch it"} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <section className="bg-card flex flex-col gap-6 rounded-2xl border p-6">
              <div>
                <h2 className="text-warning mb-3 font-medium">Next time</h2>
                <ol className="space-y-3">
                  {score.improvements.map((s) => (
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
                  {score.strengths.map((s) => (
                    <li key={s} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-success mt-2 size-1.5 shrink-0 rounded-full bg-current" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="bg-card rounded-2xl border p-6">
              <h2 className="mb-5 font-medium">Breakdown</h2>
              <DimensionBars dimensions={score.dimensions} />
            </section>
          </div>

          <section className="bg-card rounded-2xl border">
            <div className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-baseline gap-3">
                <h2 className="font-medium">Transcript</h2>
                {score.moments.length > 0 && <span className="text-muted-foreground text-xs">{score.moments.length} key moments marked</span>}
              </div>
              {hasRecording && <audio controls preload="none" className="h-9 w-full sm:max-w-sm" src={`/api/calls/${session.id}/audio`} />}
            </div>
            <div className="max-h-[640px] space-y-5 overflow-y-auto p-6">
              {transcript?.turns.map((t, i) => {
                const moment = score.moments.find((mo) => typeof t.t_start_ms === "number" && Math.abs(mo.t_ms - t.t_start_ms) < 1500);
                return (
                  <div key={i} className={`max-w-3xl ${t.role === "rep" ? "" : "pl-5"}`}>
                    <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
                      <span>{t.role === "rep" ? (isOwn ? "You" : session.profiles?.full_name ?? "Rep") : t.speaker === "gatekeeper" ? "Gatekeeper" : session.targets?.name.split(" ")[0] ?? "Prospect"}</span>
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
        </>
      )}
      {(score || collected) && <Comments sessionId={session.id} comments={comments} viewerId={viewer.userId} canDeleteAny={canManage(viewer.membership.role)} dateOf={commentDates} />}
    </div>
  );
}
