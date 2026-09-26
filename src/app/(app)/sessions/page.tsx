import Link from "next/link";
import { Phone } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { LEVELS } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScorePill } from "@/components/score-pill";

export const metadata = { title: "Calls" };

export default async function SessionsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const isManager = canManage(viewer.membership.role);

  let query = supabase
    .from("call_sessions")
    .select("*, targets(name, company), profiles(full_name), call_scores(overall)")
    .eq("org_id", viewer.org.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!isManager) query = query.eq("user_id", viewer.userId);
  const { data: sessions } = await query;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calls"
        description={isManager ? "Every practice call across your team." : "Your practice history."}
        actions={
          <Button asChild>
            <Link href="/practice">
              <Phone /> Start a call
            </Link>
          </Button>
        }
      />

      {!sessions?.length ? (
        <EmptyState icon={Phone} title="No calls yet" description="Pick a target and a level, put your headset on, and make the first dial." action={<Button asChild><Link href="/practice">Start a call</Link></Button>} />
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {isManager && <TableHead>Rep</TableHead>}
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
                      <Link href={`/sessions/${s.id}`} className="hover:underline">{formatDate(s.created_at)}</Link>
                    </TableCell>
                    {isManager && <TableCell>{s.profiles?.full_name ?? "—"}</TableCell>}
                    <TableCell>
                      <div>{s.targets?.name ?? "Deleted target"}</div>
                      <div className="text-muted-foreground text-xs">{s.targets?.company}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">L{LEVELS[s.difficulty].level} {LEVELS[s.difficulty].name}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{formatDuration(s.duration_seconds)}</TableCell>
                    <TableCell className="capitalize">{s.outcome?.replace("_", " ") ?? <span className="text-muted-foreground">{s.status}</span>}</TableCell>
                    <TableCell className="text-right"><ScorePill value={score?.overall ?? null} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
