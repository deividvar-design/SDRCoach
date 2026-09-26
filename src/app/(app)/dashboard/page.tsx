import Link from "next/link";
import { Phone, Target as TargetIcon, TrendingUp, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { LEVELS } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/score-pill";

export const metadata = { title: "Dashboard" };

function Stat({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: React.ElementType }) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-wide uppercase">
        {label}
        <Icon className="size-4" />
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="text-muted-foreground mt-1 text-xs">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const isManager = canManage(viewer.membership.role);

  let sessionsQuery = supabase
    .from("call_sessions")
    .select("id, created_at, difficulty, outcome, status, user_id, targets(name, company), profiles(full_name), call_scores(overall)")
    .eq("org_id", viewer.org.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!isManager) sessionsQuery = sessionsQuery.eq("user_id", viewer.userId);

  const [{ data: sessions }, { count: targetCount }, { count: memberCount }, { data: assignments }] = await Promise.all([
    sessionsQuery,
    supabase.from("targets").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).eq("is_archived", false),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
    supabase
      .from("assignments")
      .select("id, difficulty, due_at, required_calls, targets(name, company)")
      .eq("assigned_to", viewer.userId)
      .is("completed_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(5),
  ]);

  const all = sessions ?? [];
  const scored = all.map((s) => (Array.isArray(s.call_scores) ? s.call_scores[0]?.overall : s.call_scores?.overall)).filter((v): v is number => typeof v === "number");
  const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const booked = all.filter((s) => s.outcome === "meeting_booked").length;
  const bookRate = all.length ? Math.round((booked / all.length) * 100) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hey ${viewer.profile.full_name?.split(" ")[0] ?? "there"}`}
        description={isManager ? "Team performance at a glance." : "Keep the streak going."}
        actions={
          <Button asChild>
            <Link href="/practice">
              <Phone /> Start a call
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={isManager ? "Team calls" : "Calls made"} value={String(all.length)} icon={Phone} />
        <Stat label="Average score" value={avg == null ? "—" : avg.toFixed(1)} hint="out of 10" icon={TrendingUp} />
        <Stat label="Meetings booked" value={bookRate == null ? "—" : `${bookRate}%`} hint={`${booked} of ${all.length} calls`} icon={TargetIcon} />
        {isManager ? (
          <Stat label="Team" value={String(memberCount ?? 0)} hint={`${targetCount ?? 0} active targets`} icon={Users} />
        ) : (
          <Stat label="Assignments due" value={String(assignments?.length ?? 0)} icon={Users} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="bg-card rounded-xl border">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-medium">Recent calls</h2>
            <Link href="/sessions" className="text-muted-foreground text-sm hover:underline">View all</Link>
          </div>
          {!all.length ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">No calls yet. Make the first one.</p>
          ) : (
            <ul className="divide-y">
              {all.slice(0, 8).map((s) => {
                const score = Array.isArray(s.call_scores) ? s.call_scores[0] : s.call_scores;
                return (
                  <li key={s.id}>
                    <Link href={`/sessions/${s.id}`} className="hover:bg-accent/40 flex items-center gap-4 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.targets?.name ?? "Deleted target"}{isManager && s.profiles?.full_name ? ` · ${s.profiles.full_name}` : ""}</div>
                        <div className="text-muted-foreground text-xs">{formatDate(s.created_at)} · L{LEVELS[s.difficulty].level} {LEVELS[s.difficulty].name}</div>
                      </div>
                      {s.outcome === "meeting_booked" && <Badge variant="success">Booked</Badge>}
                      <ScorePill value={score?.overall ?? null} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-card rounded-xl border">
          <div className="border-b px-5 py-4">
            <h2 className="font-medium">{isManager ? "Levels" : "Your assignments"}</h2>
          </div>
          {isManager ? (
            <ul className="divide-y">
              {Object.values(LEVELS).map((l) => {
                const n = all.filter((s) => s.difficulty === l.id).length;
                return (
                  <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span>L{l.level} {l.name}</span>
                    <span className="text-muted-foreground tabular-nums">{n} calls</span>
                  </li>
                );
              })}
            </ul>
          ) : !assignments?.length ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">Nothing assigned. Free practice is always open.</p>
          ) : (
            <ul className="divide-y">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.targets?.name}</div>
                    <div className="text-muted-foreground text-xs">L{LEVELS[a.difficulty].level} · {a.required_calls} call{a.required_calls === 1 ? "" : "s"}{a.due_at ? ` · due ${formatDate(a.due_at)}` : ""}</div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/practice?assignment=${a.id}`}>Go</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
