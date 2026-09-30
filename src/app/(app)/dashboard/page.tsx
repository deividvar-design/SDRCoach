import Link from "next/link";
import { cookies } from "next/headers";
import { StatusToast } from "@/components/status-toast";
import { SESSION_STATUS } from "@/lib/domain/session-status";
import { ArrowUpRight, CheckCircle2, Circle, Flame, Phone, Target as TargetIcon, Trophy, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { LEVELS } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { average, leaderboard, levelProgress, personalBest, streakDays, suggestedLevel, type SessionLite } from "@/lib/stats/progress";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/score-pill";
import { StatTile } from "@/components/stat-tile";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { welcome } = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const isManager = canManage(viewer.membership.role);
  const tz = (await cookies()).get("tz")?.value;

  const [{ data: rows }, { data: members }, { count: targetCount }, { data: notes }] = await Promise.all([
    supabase
      .from("call_sessions")
      .select("id, user_id, created_at, difficulty, outcome, status, targets(name, company), profiles(full_name), call_scores(overall)")
      .eq("org_id", viewer.org.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("memberships").select("user_id, profiles!memberships_user_id_fkey(full_name)").eq("org_id", viewer.org.id),
    supabase.from("targets").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).eq("is_archived", false),
    supabase
      .from("call_comments")
      .select("id, body, created_at, session_id, author_id, profiles!call_comments_author_id_fkey(full_name), call_sessions!inner(user_id, targets(name))")
      .eq("call_sessions.user_id", viewer.userId)
      .neq("author_id", viewer.userId)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // First-run checklist for managers: what stands between them and a useful first week.
  const setup = isManager
    ? await (async () => {
        const [{ count: realTargets }, { count: knowledge }, { count: reviewed }] = await Promise.all([
          supabase.from("targets").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).eq("kind", "real").eq("is_archived", false),
          supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
          supabase.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).eq("status", "scored"),
        ]);
        return [
          { done: Boolean(viewer.org.product_description), label: "Describe what you sell", href: "/settings#company", hint: "The prospect and the coach both read it." },
          { done: (realTargets ?? 0) > 0, label: "Add a real target", href: "/targets", hint: "Someone the team is actually going to call." },
          { done: (members?.length ?? 0) > 1, label: "Invite a rep", href: "/team", hint: "Or make the first call yourself." },
          { done: (rows?.length ?? 0) > 0, label: "Make a call", href: "/practice", hint: "Level 1 is the warm-up." },
          { done: (reviewed ?? 0) > 0, label: "Get a review", href: "/sessions", hint: "Say yes on the report after a call." },
          { done: (knowledge ?? 0) > 0, label: "Upload real call transcripts", href: "/knowledge", hint: "Optional. Makes the prospect sound like your market." },
        ];
      })()
    : null;
  const setupOpen = setup?.some((s) => !s.done) ?? false;

  const all = rows ?? [];
  const lite: SessionLite[] = all.map((s) => ({
    user_id: s.user_id,
    created_at: s.created_at,
    difficulty: s.difficulty,
    outcome: s.outcome,
    overall: s.call_scores?.overall ?? null,
  }));
  const mine = lite.filter((s) => s.user_id === viewer.userId);
  const scope = isManager ? lite : mine;
  const scopeRows = isManager ? all : all.filter((s) => s.user_id === viewer.userId);

  const avg = average(scope.map((s) => s.overall).filter((v): v is number => v != null));
  const booked = scope.filter((s) => s.outcome === "meeting_booked").length;
  const decided = scope.filter((s) => s.outcome && s.outcome !== "incomplete").length;
  const bookRate = decided ? Math.round((booked / decided) * 100) : null;
  const streak = streakDays(mine, new Date(), tz);
  const best = personalBest(mine);
  const progress = levelProgress(mine);
  const nextLevel = suggestedLevel(mine);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.profiles?.full_name ?? "Rep"]));
  const board = leaderboard(lite, names);
  const firstName = viewer.profile.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <StatusToast message={welcome === "1" ? "Your workspace is ready. Make the first call whenever you like." : null} />
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric", timeZone: tz || "UTC" })}
        title={streak >= 2 ? `Day ${streak}, ${firstName}.` : `Hey ${firstName}.`}
        description={mine.length === 0 ? "Make the first dial." : streak >= 2 ? "Keep it rolling." : "Pick up the phone."}
        actions={
          <Button asChild variant="signal">
            <Link href="/practice">
              <Phone /> Start a call
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Streak" value={streak} unit={streak === 1 ? "day" : "days"} icon={Flame} hint={streak ? "Consecutive days with a call" : "Call today to start one"} highlight={streak >= 3} />
        <StatTile label={isManager ? "Team average" : "Average score"} value={avg == null ? "—" : avg.toFixed(1)} unit="/ 10" icon={TargetIcon} hint={`${scope.length} call${scope.length === 1 ? "" : "s"}`} />
        <StatTile label="Meetings booked" value={bookRate == null ? "—" : `${bookRate}%`} icon={Trophy} hint={decided ? `${booked} of ${decided} decided calls` : "The prospect decides"} />
        {isManager ? (
          <StatTile label="Team" value={members?.length ?? 0} unit={`/ ${viewer.org.seat_limit} seats`} icon={Users} hint={`${targetCount ?? 0} active targets`} />
        ) : (
          <StatTile label="Personal best" value={best == null ? "—" : best.toFixed(1)} unit="/ 10" icon={ArrowUpRight} hint={best == null ? "Set one today" : "Beat it"} />
        )}
      </div>

      {setup && setupOpen && (
        <section className="bg-card paper-grain rounded-2xl border p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">Get set up</h2>
            <span className="text-muted-foreground text-xs">{setup.filter((s) => s.done).length} of {setup.length} done</span>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {setup.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${s.done ? "text-muted-foreground" : "hover:bg-accent/40"}`}>
                  {s.done ? <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" /> : <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />}
                  <span>
                    <span className={s.done ? "line-through" : "font-medium"}>{s.label}</span>
                    <span className="text-muted-foreground block text-xs">{s.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="bg-card rounded-2xl border">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-medium">Recent calls</h2>
            <Link href="/sessions" className="text-muted-foreground text-sm hover:underline">View all</Link>
          </div>
          {!scopeRows.length ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">No calls yet. Make the first one.</p>
          ) : (
            <ul className="divide-y">
              {scopeRows.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <Link href={`/sessions/${s.id}`} className="hover:bg-accent/40 flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {s.targets?.name ?? "Deleted target"}
                        {isManager && s.profiles?.full_name ? <span className="text-muted-foreground font-normal">, {s.profiles.full_name}</span> : null}
                      </div>
                      <div className="text-muted-foreground text-xs">{formatDate(s.created_at)}, L{LEVELS[s.difficulty].level} {LEVELS[s.difficulty].name}</div>
                    </div>
                    {s.outcome === "meeting_booked" && <Badge variant="success">Booked</Badge>}
                    {!s.outcome && s.status !== "scored" && <Badge variant="secondary">{SESSION_STATUS[s.status].label}</Badge>}
                    <ScorePill value={s.call_scores?.overall ?? null} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="bg-card rounded-2xl border">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-medium">Your levels</h2>
              <Link href={`/team/${viewer.userId}`} className="text-muted-foreground text-sm hover:underline">Your progress</Link>
            </div>
            <ul className="divide-y">
              {progress.map((p) => (
                <li key={p.level.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <div className="font-medium">
                      L{p.level.level} {p.level.name}
                      {p.ready && (
                        <Badge variant="success" className="ml-2">Ready for L{p.next?.level}</Badge>
                      )}
                      {nextLevel === p.level.id && mine.length > 0 && !p.ready && (
                        <Badge variant="outline" className="ml-2">Current</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {p.calls} call{p.calls === 1 ? "" : "s"}
                      {p.recentAvg != null ? `, last ${Math.min(p.calls, 3)} avg ${p.recentAvg.toFixed(1)}` : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/practice?difficulty=${p.level.id}`}>Dial</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          {!!notes?.length && (
            <section className="bg-card rounded-2xl border">
              <div className="border-b px-5 py-4">
                <h2 className="font-medium">Coach said</h2>
              </div>
              <ul className="divide-y">
                {notes.map((n) => (
                  <li key={n.id} className="px-5 py-3 text-sm">
                    <Link href={`/sessions/${n.session_id}`} className="block">
                      <p className="clamp-fade">{n.body}</p>
                      <div className="text-muted-foreground mt-1 text-xs">{n.profiles?.full_name ?? "Manager"}, on your {n.call_sessions?.targets?.name ?? "call"} call, {formatDate(n.created_at)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </div>

      <section className="bg-card rounded-2xl border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-medium">This week on the floor</h2>
          <span className="text-muted-foreground text-xs">Ranked by calls made, last 7 days. Average after 3 reviews.</span>
        </div>
        {!board.length ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">Nobody has called this week. First one takes the top spot.</p>
        ) : (
          <ol className="divide-y">
            {board.slice(0, 8).map((r, i) => (
              <li key={r.user_id} className={`flex items-center gap-4 px-5 py-3 text-sm ${r.user_id === viewer.userId ? "bg-accent/40" : ""}`}>
                <span className="text-muted-foreground w-5 font-mono text-xs tabular">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {isManager || viewer.org.reps_see_team ? <Link href={`/team/${r.user_id}`} className="hover:underline">{r.name}</Link> : r.name}
                  {r.user_id === viewer.userId && <span className="text-muted-foreground font-normal"> (you)</span>}
                </span>
                <span className="text-muted-foreground hidden font-mono text-xs tabular sm:inline">{r.calls} {r.calls === 1 ? "call" : "calls"}, {r.booked} booked</span>
                {r.avg == null ? <span className="text-muted-foreground text-xs">{r.reviewed === 0 ? "no review yet" : `${r.reviewed} of 3 reviewed`}</span> : <ScorePill value={r.avg} />}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
