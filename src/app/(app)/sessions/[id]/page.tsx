import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { LEVELS } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/score-pill";

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  await requireViewer();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("call_sessions")
    .select("*, targets(name, title, company), profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const [{ data: score }, { data: transcript }] = await Promise.all([
    supabase.from("call_scores").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("call_transcripts").select("*").eq("session_id", id).maybeSingle(),
  ]);
  const level = LEVELS[session.difficulty];

  return (
    <div className="space-y-8">
      <PageHeader
        title={session.targets ? `${session.targets.name}, ${session.targets.company}` : "Call"}
        description={`${formatDate(session.created_at)} · ${formatDuration(session.duration_seconds)} · ${session.profiles?.full_name ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">L{level.level} {level.name}</Badge>
            <ScorePill value={score?.overall ?? null} className="text-base px-3 py-1" />
          </div>
        }
      />

      {!score ? (
        <div className="bg-card text-muted-foreground rounded-xl border p-6 text-sm">
          {session.status === "scoring" ? "The coach is reviewing this call. Refresh in a moment." : "No score for this call yet."}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <div className="bg-card rounded-xl border p-6">
              <h2 className="mb-2 font-medium">Coach summary</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{score.coach_summary}</p>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <h2 className="mb-4 font-medium">Breakdown</h2>
              <dl className="space-y-4">
                {Object.entries(score.dimensions).map(([key, d]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <dt className="text-sm capitalize">{key.replaceAll("_", " ")}</dt>
                      <ScorePill value={d.score} />
                    </div>
                    <dd className="text-muted-foreground mt-1 text-xs">{d.rationale}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="bg-card rounded-xl border p-6">
                <h2 className="text-success mb-3 text-sm font-medium">What worked</h2>
                <ul className="text-muted-foreground list-disc space-y-2 pl-4 text-sm">{score.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="bg-card rounded-xl border p-6">
                <h2 className="text-warning mb-3 text-sm font-medium">Work on next</h2>
                <ul className="text-muted-foreground list-disc space-y-2 pl-4 text-sm">{score.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-6">
            <h2 className="mb-4 font-medium">Transcript</h2>
            <div className="space-y-4">
              {transcript?.turns.map((t, i) => (
                <div key={i} className={t.role === "rep" ? "pl-0" : "pl-6"}>
                  <div className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
                    {t.role === "rep" ? "You" : session.targets?.name ?? "Prospect"}
                  </div>
                  <p className="text-sm leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
