import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { notFound } from "next/navigation";
import { LEVELS } from "@/lib/domain/levels";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { RUBRIC, RUBRIC_KEYS, type RubricKey } from "@/lib/scoring/rubric";
import { average, levelProgress, personalBest, streakDays, type SessionLite } from "@/lib/stats/progress";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration, initials } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScorePill } from "@/components/score-pill";
import { StatTile } from "@/components/stat-tile";
import { TrendChart } from "@/components/report/trend-chart";
import type { ScoreDimensions } from "@/types/database";

export const metadata = { title: "Rep" };

export default async function RepPage({ params }: PageProps<"/team/[userId]">) {
  const { userId } = await params;
  const viewer = await requireViewer();
  const isManager = canManage(viewer.membership.role);
  if (!isManager && !viewer.org.reps_see_team && userId !== viewer.userId) notFound();
  const supabase = await createClient();

  const [{ data: membership }, { data: sessions }, { data: assignments }] = await Promise.all([
    supabase.from("memberships").select("role, profiles!memberships_user_id_fkey(full_name, avatar_url)").eq("org_id", viewer.org.id).eq("user_id", userId).maybeSingle(),
    supabase
      .from("call_sessions")
      .select("id, created_at, difficulty, outcome, status, duration_seconds, targets(name, company), call_scores(overall, dimensions)")
      .eq("org_id", viewer.org.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("assignments").select("id, difficulty, required_calls, due_at, completed_at, targets(name)").eq("assigned_to", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  if (!membership) notFound();

  const name = membership.profiles?.full_name ?? "Rep";
  const all = sessions ?? [];
  const lite: SessionLite[] = all.map((s) => ({ user_id: userId, created_at: s.created_at, difficulty: s.difficulty, outcome: s.outcome, overall: s.call_scores?.overall ?? null }));
  const scored = all.filter((s) => s.call_scores?.overall != null);
  const avg = average(scored.map((s) => s.call_scores!.overall));
  const booked = all.filter((s) => s.outcome === "meeting_booked").length;
  const decided = all.filter((s) => s.outcome && s.outcome !== "incomplete").length;

  const dimAverages = RUBRIC_KEYS.map((k) => {
    const vals = scored.map((s) => (s.call_scores!.dimensions as ScoreDimensions)?.[k]?.score).filter((v): v is number => typeof v === "number");
    return { key: k as RubricKey, avg: average(vals) };
  }).filter((d) => d.avg != null) as { key: RubricKey; avg: number }[];
  const weakest = [...dimAverages].sort((a, b) => a.avg - b.avg)[0];
  const strongest = [...dimAverages].sort((a, b) => b.avg - a.avg)[0];

  const trend = [...scored]
    .reverse()
    .slice(-20)
    .map((s) => ({ id: s.id, label: `${formatDate(s.created_at)} · ${s.targets?.name ?? ""}`, value: s.call_scores!.overall }));

  const progress = levelProgress(lite);

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/team">
          <ArrowLeft /> Team
        </Link>
      </Button>
      <PageHeader
        eyebrow={ROLE_LABEL[membership.role]}
        title={
          <span className="flex items-center gap-4">
            <Avatar className="size-12 text-base">
              {membership.profiles?.avatar_url && <AvatarImage src={membership.profiles.avatar_url} alt="" />}
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            {name}
          </span>
        }
        description={weakest && strongest ? `Strongest at ${RUBRIC[strongest.key].label.toLowerCase()}. The biggest lift is ${RUBRIC[weakest.key].label.toLowerCase()}.` : "No scored calls yet."}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Calls" value={all.length} hint={`${scored.length} scored`} />
        <StatTile label="Average" value={avg == null ? "—" : avg.toFixed(1)} unit="/ 10" />
        <StatTile label="Booked" value={decided ? `${Math.round((booked / decided) * 100)}%` : "—"} hint={decided ? `${booked} of ${decided} decided` : undefined} />
        <StatTile label="Streak" value={streakDays(lite)} unit="days" hint={`Best score ${personalBest(lite)?.toFixed(1) ?? "—"}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-4 font-medium">Score over time</h2>
          <TrendChart points={trend} />
        </section>
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-4 font-medium">By dimension</h2>
          {!dimAverages.length ? (
            <p className="text-muted-foreground text-sm">Nothing scored yet.</p>
          ) : (
            <dl className="space-y-4">
              {dimAverages.map((d) => (
                <div key={d.key}>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-sm">{RUBRIC[d.key].label}</dt>
                    <span className="font-mono text-sm tabular">{d.avg.toFixed(1)}</span>
                  </div>
                  <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                    <div className={`h-full rounded-r-[4px] ${d.key === weakest?.key ? "bg-warning" : "bg-foreground"}`} style={{ width: `${(d.avg / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="bg-card rounded-2xl border">
          <div className="border-b px-5 py-4">
            <h2 className="font-medium">Levels</h2>
          </div>
          <ul className="divide-y">
            {progress.map((p) => (
              <li key={p.level.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  L{p.level.level} {p.level.name}
                  {p.ready && <Badge variant="success" className="ml-2">Ready for L{p.next?.level}</Badge>}
                </span>
                <span className="text-muted-foreground font-mono text-xs tabular">
                  {p.calls} calls{p.recentAvg != null ? ` · ${p.recentAvg.toFixed(1)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-card rounded-2xl border">
          <div className="border-b px-5 py-4">
            <h2 className="font-medium">Assignments</h2>
          </div>
          {!assignments?.length ? (
            <p className="text-muted-foreground px-5 py-8 text-center text-sm">None yet. Assign practice from the Team page.</p>
          ) : (
            <ul className="divide-y">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    {a.targets?.name} <span className="text-muted-foreground">· L{LEVELS[a.difficulty].level}</span>
                  </span>
                  <Badge variant={a.completed_at ? "success" : "secondary"}>{a.completed_at ? "Done" : `${a.required_calls} calls${a.due_at ? ` by ${formatDate(a.due_at)}` : ""}`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4">
          <h2 className="font-medium">All calls</h2>
        </div>
        {!all.length ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">No calls yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Length</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/sessions/${s.id}`} className="hover:underline">{formatDate(s.created_at)}</Link>
                  </TableCell>
                  <TableCell>
                    {s.targets?.name ?? "Deleted target"} <span className="text-muted-foreground text-xs">{s.targets?.company}</span>
                  </TableCell>
                  <TableCell><Badge variant="secondary">L{LEVELS[s.difficulty].level}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{formatDuration(s.duration_seconds)}</TableCell>
                  <TableCell className="capitalize">{s.outcome?.replace("_", " ") ?? <span className="text-muted-foreground">{s.status}</span>}</TableCell>
                  <TableCell className="text-right"><ScorePill value={s.call_scores?.overall ?? null} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
