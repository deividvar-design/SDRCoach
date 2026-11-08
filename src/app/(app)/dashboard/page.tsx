import Link from "next/link";
import { dateFormatter } from "@/lib/tz";
import { daysAgoIso } from "@/lib/utils";
import { cookies } from "next/headers";
import { StatusToast } from "@/components/status-toast";
import { SESSION_STATUS } from "@/lib/domain/session-status";
import { Check, Phone } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/paginate";
import { canManage } from "@/lib/domain/roles";
import { LEVELS } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";

import { average, leaderboard, levelProgress, personalBest, streakDays, suggestedLevel, type SessionLite } from "@/lib/stats/progress";
import { BrandPanel, callPillClass, callPillIconClass } from "@/components/shell/brand-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/score-pill";
import { StatTile } from "@/components/stat-tile";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { welcome } = await searchParams;
  const viewer = await requireViewer();
  const fmtDate = await dateFormatter();
  const supabase = await createClient();
  const isManager = canManage(viewer.membership.role);
  const tz = (await cookies()).get("tz")?.value;

  const select = "id, user_id, created_at, difficulty, outcome, status, boss, targets(name, company), profiles(full_name), call_scores(overall)";
  // A rep only sees teammates on the leaderboard, which covers the last 7 days and needs no names or targets.
  const teamSelect = "id, user_id, created_at, difficulty, outcome, status, boss, call_scores(overall)";
  const [{ data: ownRows }, orgRows, { data: members }, { count: targetCount }, { data: notes }, setupCounts] = await Promise.all([
    // The viewer's own history, so streaks and personal bests never depend on how busy the rest of the team is.
    supabase.from("call_sessions").select(select).eq("org_id", viewer.org.id).eq("user_id", viewer.userId).order("created_at", { ascending: false }).limit(500),
    // Managers: the team's last 30 days, complete, for the team stats and the leaderboard.
    isManager
      ? fetchAll((a, b) => supabase.from("call_sessions").select(select).eq("org_id", viewer.org.id).gte("created_at", daysAgoIso(30)).order("created_at", { ascending: false }).range(a, b))
      : viewer.org.reps_see_team
        ? fetchAll((a, b) => supabase.from("call_sessions").select(teamSelect).eq("org_id", viewer.org.id).gte("created_at", daysAgoIso(7)).order("created_at", { ascending: false }).range(a, b)).then((rows) =>
            rows.map((r) => ({ ...r, targets: null, profiles: null })),
          )
        : Promise.resolve([] as never[]),
    supabase.from("memberships").select("user_id, profiles!memberships_user_id_fkey(full_name)").eq("org_id", viewer.org.id),
    supabase.from("targets").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).eq("is_archived", false),
    supabase
      .from("call_comments")
      .select("id, body, created_at, session_id, author_id, profiles!call_comments_author_id_fkey(full_name), call_sessions!inner(user_id, targets(name))")
      .eq("call_sessions.user_id", viewer.userId)
      .neq("author_id", viewer.userId)
      .order("created_at", { ascending: false })
      .limit(4),
    // First-run checklist counts for managers, loaded with everything else rather than after it.
    isManager
      ? Promise.all([
          supabase.from("targets").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).eq("kind", "real").eq("is_archived", false),
          supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
          supabase.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).eq("status", "scored"),
        ])
      : null,
  ]);

  // First-run checklist for managers: what stands between them and a useful first week.
  const setup = setupCounts
    ? (() => {
        const [{ count: realTargets }, { count: knowledge }, { count: reviewed }] = setupCounts;
        return [
          { done: Boolean(viewer.org.product_description), label: "Describe what you sell", href: "/settings#company", hint: "The prospect and the coach both read it." },
          { done: (realTargets ?? 0) > 0, label: "Add a real target", href: "/targets", hint: "Someone the team is actually going to call." },
          { done: (members?.length ?? 0) > 1, label: "Invite a rep", href: "/team", hint: "Or make the first call yourself." },
          { done: (ownRows?.length ?? 0) + orgRows.length > 0, label: "Make a call", href: "/practice", hint: "Level 1 is the warm-up." },
          { done: (reviewed ?? 0) > 0, label: "Get a review", href: "/sessions", hint: "Say yes on the report after a call." },
          { done: (knowledge ?? 0) > 0, label: "Upload real call transcripts", href: "/knowledge", hint: "Optional. Makes the prospect sound like your market." },
        ];
      })()
    : null;
  const setupOpen = setup?.some((s) => !s.done) ?? false;

  const own = ownRows ?? [];
  const all = [...own, ...orgRows.filter((r) => r.user_id !== viewer.userId)].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const lite: SessionLite[] = all.map((s) => ({
    user_id: s.user_id,
    created_at: s.created_at,
    difficulty: s.difficulty,
    outcome: s.outcome,
    overall: s.call_scores?.overall ?? null,
    boss: s.boss,
  }));
  const mine = lite.filter((s) => s.user_id === viewer.userId);
  const scope = isManager ? lite : mine;
  const scopeRows = isManager ? all : all.filter((s) => s.user_id === viewer.userId);

  const real = scope.filter((s) => !s.boss);
  const avg = average(real.map((s) => s.overall).filter((v): v is number => v != null));
  const booked = real.filter((s) => s.outcome === "meeting_booked").length;
  const decided = real.filter((s) => s.outcome && s.outcome !== "incomplete").length;
  const bookRate = decided ? Math.round((booked / decided) * 100) : null;
  const streak = streakDays(mine, new Date(), tz);
  const best = personalBest(mine);
  const progress = levelProgress(mine);
  const nextLevel = suggestedLevel(mine);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.profiles?.full_name ?? "Rep"]));
  const thirtyDaysAgo = daysAgoIso(30);
  const activeSeats = new Set(all.filter((r) => r.created_at >= thirtyDaysAgo).map((r) => r.user_id)).size;
  const board = leaderboard(lite, names);
  const firstName = viewer.profile.full_name?.split(" ")[0] ?? "there";

  const pill = "h-7 min-w-[42px] items-center justify-center rounded-lg px-2 text-sm font-semibold";
  const setupDone = setup?.filter((s) => !!s.done).length ?? 0;

  return (
    <div className="space-y-[18px]">
      <StatusToast message={welcome === "1" ? "Your workspace is ready. Make the first call whenever you like." : null} />
      <BrandPanel className="flex flex-wrap items-center justify-between gap-5 px-6 py-7 md:px-8">
        <div>
          <p className="text-sm text-[#b9c0cb]">{new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric", timeZone: tz || "UTC" })}</p>
          <h1 className="mt-1.5 text-[34px] leading-tight font-semibold tracking-[-0.025em]">{streak >= 2 ? `Day ${streak}, ${firstName}.` : `Hey ${firstName}.`}</h1>
          <p className="mt-1.5 text-base text-[#d9d4c9]">{mine.length === 0 ? "Make the first dial." : best != null ? `Your best score so far is ${best.toFixed(1)}. ${streak >= 2 ? "Keep it rolling." : "Pick up the phone."}` : streak >= 2 ? "Keep it rolling." : "Pick up the phone."}</p>
        </div>
        <Link href="/practice" className={callPillClass}>
          Start a call
          <span aria-hidden className={callPillIconClass}><Phone className="size-3.5" strokeWidth={2.2} /></span>
        </Link>
      </BrandPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Streak" value={streak} unit={streak === 1 ? "day" : "days"} hint={streak ? "Consecutive days with a call" : "Call today to start one"} highlight={streak >= 3} />
        <StatTile label={isManager ? "Team average" : "Average score"} value={avg == null ? "-" : avg.toFixed(1)} unit="/ 10" hint={`${scope.length} call${scope.length === 1 ? "" : "s"}`} />
        <StatTile label="Meetings booked" value={bookRate == null ? "-" : `${bookRate}%`} hint={decided ? `${booked} of ${decided} decided calls` : "The prospect decides"} />
        {isManager ? (
          <StatTile label="Team" value={members?.length ?? 0} unit={`/ ${viewer.org.seat_limit} seats`} hint={`${activeSeats} dialed in the last 30 days, ${targetCount ?? 0} live targets`} />
        ) : (
          <StatTile label="Personal best" value={best == null ? "-" : best.toFixed(1)} unit="/ 10" hint={best == null ? "Set one today" : "Beat it"} />
        )}
      </div>

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-[18px]">
          <section className="bg-card overflow-hidden rounded-[18px] border">
            <div className="flex items-center justify-between px-6 py-[18px]">
              <h2 className="text-[17px] font-semibold">Recent calls</h2>
              <Link href="/sessions" className="text-sm font-semibold hover:underline">View all</Link>
            </div>
            {!scopeRows.length ? (
              <p className="text-muted-foreground border-t px-6 py-10 text-center text-sm">No calls yet. Make the first one.</p>
            ) : (
              <ul>
                {scopeRows.slice(0, 8).map((s) => (
                  <li key={s.id} className="border-t">
                    <Link href={`/sessions/${s.id}`} className="hover:bg-accent/40 flex items-center gap-3.5 px-6 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">
                          {s.targets?.name ?? "Deleted target"}
                          {s.targets?.company ? <span className="text-muted-foreground font-normal"> · {s.targets.company}</span> : null}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[13px]">
                          {isManager && s.profiles?.full_name ? `${s.profiles.full_name} · ` : ""}{fmtDate(s.created_at)} · {s.boss ? "Boss fight" : `L${LEVELS[s.difficulty].level} ${LEVELS[s.difficulty].name}`}
                        </div>
                      </div>
                      {s.outcome === "meeting_booked" && <Badge variant="success">Booked</Badge>}
                      {!s.outcome && s.status !== "scored" && <Badge variant="secondary">{SESSION_STATUS[s.status].label}</Badge>}
                      <ScorePill value={s.call_scores?.overall ?? null} className={pill} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-card overflow-hidden rounded-[18px] border">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 py-[18px]">
              <h2 className="text-[17px] font-semibold">This week on the floor</h2>
              <span className="text-muted-foreground text-[13px]">Ranked by calls made, last 7 days. Average after 3 reviews.</span>
            </div>
            {!board.length ? (
              <p className="text-muted-foreground border-t px-6 py-8 text-center text-sm">Nobody has called this week. First one takes the top spot.</p>
            ) : (
              <ol>
                {board.slice(0, 8).map((r, i) => {
                  const top = board[0]?.calls || 1;
                  return (
                    <li key={r.user_id} className={`flex items-center gap-4 border-t px-6 py-3 text-[15px] ${r.user_id === viewer.userId ? "bg-accent/40" : ""}`}>
                      <span className="text-muted-foreground w-5 font-semibold tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold sm:flex-none sm:basis-40">
                        {isManager || viewer.org.reps_see_team ? <Link href={`/team/${r.user_id}`} className="hover:underline">{r.name}</Link> : r.name}
                        {r.user_id === viewer.userId && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </span>
                      <span className="hidden shrink-0 text-sm tabular-nums sm:inline">{r.calls} {r.calls === 1 ? "call" : "calls"}</span>
                      <span aria-hidden className="bg-border hidden h-1.5 flex-1 rounded-full sm:block">
                        <span className={`block h-1.5 rounded-full ${i === 0 ? "bg-signal" : "bg-primary"}`} style={{ width: `${Math.max(4, Math.round((r.calls / top) * 100))}%` }} />
                      </span>
                      {r.avg == null ? <span className="text-muted-foreground text-xs">{r.reviewed === 0 ? "no review yet" : `${r.reviewed} of 3 reviewed`}</span> : <ScorePill value={r.avg} className={pill} />}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-[18px]">
          <section className="bg-card overflow-hidden rounded-[18px] border">
            <div className="flex items-center justify-between px-6 py-[18px]">
              <h2 className="text-[17px] font-semibold">Your levels</h2>
              <Link href={`/team/${viewer.userId}`} className="text-sm font-semibold hover:underline">Your progress</Link>
            </div>
            <ul>
              {progress.map((p) => (
                <li key={p.level.id} className="flex items-center gap-3.5 border-t px-6 py-3.5">
                  <span aria-hidden className="flex h-5 items-end gap-[3px]">
                    {[1, 2, 3].map((b) => <span key={b} className={`w-[5px] rounded-sm ${b <= p.level.level ? "bg-signal-ink" : "bg-[#d8d1c2] dark:bg-white/15"}`} style={{ height: b * 6 }} />)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                      L{p.level.level} {p.level.name}
                      {p.ready && <span data-band="hi" className="rounded-full px-2 py-0.5 text-xs font-semibold">Ready for L{p.next?.level}</span>}
                      {nextLevel === p.level.id && mine.length > 0 && !p.ready && <span data-band="mid" className="rounded-full px-2 py-0.5 text-xs font-semibold">Current</span>}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[13px]">
                      {p.calls} call{p.calls === 1 ? "" : "s"}
                      {p.recentAvg != null ? ` · last ${Math.min(p.calls, 3)} avg ${p.recentAvg.toFixed(1)}` : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="bg-card h-9 px-3.5 text-sm font-semibold" asChild>
                    <Link href={`/practice?difficulty=${p.level.id}`}><Phone className="size-3.5" /> Dial</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          {setup && setupOpen && (
            <section className="bg-card rounded-[18px] border px-6 pt-[18px] pb-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[17px] font-semibold">Get set up</h2>
                <span className="text-muted-foreground text-[13px]">{setupDone} of {setup.length} done</span>
              </div>
              <span aria-hidden className="bg-border mt-3 mb-1.5 block h-1.5 rounded-full">
                <span className="bg-signal block h-1.5 rounded-full" style={{ width: `${Math.round((setupDone / setup.length) * 100)}%` }} />
              </span>
              <ul>
                {setup.map((s) => (
                  <li key={s.label} className="border-t">
                    <Link href={s.href} className={`flex items-center gap-2.5 py-2.5 text-sm ${s.done ? "text-muted-foreground" : ""}`} title={s.hint}>
                      {s.done ? (
                        <span aria-hidden className="bg-primary text-primary-foreground grid size-5 shrink-0 place-items-center rounded-full"><Check className="size-3" strokeWidth={3} /></span>
                      ) : (
                        <span aria-hidden className="size-5 shrink-0 rounded-full border-[1.5px] border-[#b9b1a2]" />
                      )}
                      <span className={s.done ? "line-through" : "font-semibold"}>{s.label}</span>
                      {s.done && <span className="sr-only">(done)</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!!notes?.length && (
            <section className="bg-card overflow-hidden rounded-[18px] border">
              <div className="px-6 py-[18px]">
                <h2 className="text-[17px] font-semibold">Coach said</h2>
              </div>
              <ul>
                {notes.map((n) => (
                  <li key={n.id} className="border-t px-6 py-3.5 text-sm">
                    <Link href={`/sessions/${n.session_id}`} className="block">
                      <p className="clamp-fade">{n.body}</p>
                      <div className="text-muted-foreground mt-1 text-[13px]">{n.profiles?.full_name ?? "Manager"}, on your {n.call_sessions?.targets?.name ?? "call"} call, {fmtDate(n.created_at)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
