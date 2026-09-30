import Link from "next/link";
import { dateFormatter } from "@/lib/tz";
import { Phone } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { LEVELS, LEVEL_LIST } from "@/lib/domain/levels";
import { OUTCOME_TEXT, SESSION_STATUS } from "@/lib/domain/session-status";
import { createClient } from "@/lib/supabase/server";
import {formatDuration} from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScorePill } from "@/components/score-pill";
import type { Difficulty } from "@/types/database";

export const metadata = { title: "Calls" };

const PAGE = 50;
const OUTCOMES = ["meeting_booked", "callback", "info_sent", "rejected", "hung_up", "incomplete"] as const;

export default async function SessionsPage({ searchParams }: PageProps<"/sessions">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const scope = one(sp.scope);
  const level = LEVEL_LIST.some((l) => l.id === one(sp.level)) ? (one(sp.level) as Difficulty) : undefined;
  const outcome = (OUTCOMES as readonly string[]).includes(one(sp.outcome) ?? "") ? (one(sp.outcome) as (typeof OUTCOMES)[number]) : undefined;
  const before = one(sp.before);

  const viewer = await requireViewer();
  const fmtDate = await dateFormatter();
  const supabase = await createClient();
  const isManager = canManage(viewer.membership.role);
  const canSeeTeam = isManager || viewer.org.reps_see_team;
  const showTeam = canSeeTeam && (isManager ? scope !== "mine" : scope === "team");

  let query = supabase
    .from("call_sessions")
    .select("*, targets(name, company), profiles(full_name), call_scores(overall)")
    .eq("org_id", viewer.org.id)
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  if (!showTeam) query = query.eq("user_id", viewer.userId);
  if (level) query = query.eq("difficulty", level);
  if (outcome) query = query.eq("outcome", outcome);
  if (before) query = query.lt("created_at", before);
  const { data } = await query;
  const rows = data ?? [];
  const sessions = rows.slice(0, PAGE);
  const hasMore = rows.length > PAGE;

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { scope, level, outcome, before, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/sessions?${s}` : "/sessions";
  };
  const chip = (active: boolean) => `rounded-full px-3 py-1 text-xs ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`;
  const filtered = Boolean(level || outcome);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calls"
        description={showTeam ? "Every practice call across your team." : "Your practice history."}
        actions={
          <div className="flex items-center gap-2">
            {canSeeTeam && (
              <div className="flex gap-1 rounded-full border p-1">
                <Link href={href({ scope: "mine", before: undefined })} className={chip(!showTeam)}>Mine</Link>
                <Link href={href({ scope: "team", before: undefined })} className={chip(showTeam)}>Team</Link>
              </div>
            )}
            <Button asChild>
              <Link href="/practice">
                <Phone /> Start a call
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border p-1">
          <Link href={href({ level: undefined, before: undefined })} className={chip(!level)}>All levels</Link>
          {LEVEL_LIST.map((l) => (
            <Link key={l.id} href={href({ level: l.id, before: undefined })} className={chip(level === l.id)}>L{l.level}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border p-1">
          <Link href={href({ outcome: undefined, before: undefined })} className={chip(!outcome)}>Any outcome</Link>
          {OUTCOMES.map((o) => (
            <Link key={o} href={href({ outcome: o, before: undefined })} className={chip(outcome === o)}>{OUTCOME_TEXT[o]}</Link>
          ))}
        </div>
      </div>

      {!sessions.length ? (
        filtered || before ? (
          <EmptyState icon={Phone} title="No calls match" description="Try a different level or outcome." action={<Button variant="outline" asChild><Link href={href({ level: undefined, outcome: undefined, before: undefined })}>Clear filters</Link></Button>} />
        ) : (
          <EmptyState icon={Phone} title="No calls yet" description="Pick a target and a level, put your headset on, and make the first dial." action={<Button asChild><Link href="/practice">Start a call</Link></Button>} />
        )
      ) : (
        <div className="bg-card rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {showTeam && <TableHead>Rep</TableHead>}
                  <TableHead>Target</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const score = Array.isArray(s.call_scores) ? s.call_scores[0] : s.call_scores;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/sessions/${s.id}`} className="hover:underline">{fmtDate(s.created_at)}</Link>
                      </TableCell>
                      {showTeam && <TableCell>{s.profiles?.full_name ?? "—"}</TableCell>}
                      <TableCell>
                        <div>{s.targets?.name ?? "Deleted target"}</div>
                        <div className="text-muted-foreground text-xs">{s.targets?.company}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">L{LEVELS[s.difficulty].level} {LEVELS[s.difficulty].name}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{formatDuration(s.duration_seconds)}</TableCell>
                      <TableCell>
                        {s.outcome ? OUTCOME_TEXT[s.outcome] : <span className={SESSION_STATUS[s.status].tone === "warn" ? "text-destructive" : "text-muted-foreground"}>{SESSION_STATUS[s.status].label}</span>}
                        {s.outcome && s.status === "collected" && <span className="text-muted-foreground ml-2 text-xs">not reviewed</span>}
                      </TableCell>
                      <TableCell className="text-right"><ScorePill value={score?.overall ?? null} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {(hasMore || before) && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <Link href={href({ before: undefined })} className={`text-muted-foreground hover:underline ${before ? "" : "invisible"}`}>Newest</Link>
              {hasMore && <Link href={href({ before: sessions[sessions.length - 1]!.created_at })} className="hover:underline">Older calls →</Link>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
