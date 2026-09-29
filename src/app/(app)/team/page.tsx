import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials, isPast } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScorePill } from "@/components/score-pill";
import { InviteForm } from "./invite-form";
import { CopyLink } from "./copy-link";
import { AssignForm } from "./assign-form";
import { deleteAssignment, revokeInvite } from "./actions";
import { LEVELS } from "@/lib/domain/levels";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const viewer = await requireManager();
  const supabase = await createClient();

  const [{ data: members }, { data: invites }, { data: sessions }, { data: targets }, { data: assignments }] = await Promise.all([
    supabase.from("memberships").select("*, profiles!memberships_user_id_fkey(full_name, avatar_url)").eq("org_id", viewer.org.id).order("created_at"),
    supabase.from("invites").select("*").eq("org_id", viewer.org.id).is("accepted_at", null).order("created_at", { ascending: false }),
    supabase.from("call_sessions").select("user_id, outcome, assignment_id, status, call_scores(overall)").eq("org_id", viewer.org.id),
    supabase.from("targets").select("id, name, title, company").eq("org_id", viewer.org.id).eq("is_archived", false).order("name"),
    supabase
      .from("assignments")
      .select("id, assigned_to, difficulty, required_calls, due_at, note, completed_at, targets(name, company), profiles!assignments_assigned_to_fkey(full_name)")
      .eq("org_id", viewer.org.id)
      .is("completed_at", null)
      .order("due_at", { ascending: true, nullsFirst: false }),
  ]);

  const doneByAssignment = new Map<string, number>();
  for (const s of sessions ?? []) {
    if (s.assignment_id && (s.status === "scored" || s.status === "collected") && s.outcome !== "incomplete") doneByAssignment.set(s.assignment_id, (doneByAssignment.get(s.assignment_id) ?? 0) + 1);
  }

  const statsByUser = new Map<string, { calls: number; booked: number; scores: number[] }>();
  for (const s of sessions ?? []) {
    const entry = statsByUser.get(s.user_id) ?? { calls: 0, booked: 0, scores: [] };
    entry.calls += 1;
    if (s.outcome === "meeting_booked") entry.booked += 1;
    const sc = Array.isArray(s.call_scores) ? s.call_scores[0]?.overall : s.call_scores?.overall;
    if (typeof sc === "number") entry.scores.push(sc);
    statsByUser.set(s.user_id, entry);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description={`${members?.length ?? 0} of ${viewer.org.seat_limit} seats in use.`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/team/coaching">Coaching insights</Link>
          </Button>
        }
      />

      <section className="bg-card rounded-xl border p-6">
        <h2 className="mb-4 font-medium">Invite someone</h2>
        <InviteForm />
        {!!invites?.length && (
          <ul className="mt-6 divide-y border-t">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <span>{i.email}</span> <Badge variant="secondary" className="ml-2">{ROLE_LABEL[i.role]}</Badge>
                  <div className="text-muted-foreground text-xs">Expires {formatDate(i.expires_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyLink link={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${i.token}`} />
                  <form action={revokeInvite.bind(null, i.id)}>
                    <Button size="sm" variant="ghost" type="submit">Revoke</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-card rounded-xl border p-6">
        <h2 className="mb-1 font-medium">Assign practice</h2>
        <p className="text-muted-foreground mb-4 text-sm">Give a rep a specific target and level to work before the real outreach starts. It lands on their dashboard.</p>
        <AssignForm
          reps={(members ?? []).map((m) => ({ id: m.user_id, label: m.profiles?.full_name ?? "Rep" }))}
          targets={(targets ?? []).map((t) => ({ id: t.id, label: `${t.name} · ${t.title}, ${t.company}` }))}
        />
        {!!assignments?.length && (
          <ul className="mt-6 divide-y border-t">
            {assignments.map((a) => {
              const done = Math.min(doneByAssignment.get(a.id) ?? 0, a.required_calls);
              const overdue = isPast(a.due_at);
              return (
                <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {a.profiles?.full_name ?? "Rep"} <span className="text-muted-foreground font-normal">→</span> {a.targets?.name}
                      <Badge variant="secondary" className="ml-2">L{LEVELS[a.difficulty].level} {LEVELS[a.difficulty].name}</Badge>
                      {overdue && <Badge variant="destructive" className="ml-1">Overdue</Badge>}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {a.due_at ? `Due ${formatDate(a.due_at)}` : "No due date"}
                      {a.note ? ` · ${a.note}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:w-64">
                    <Progress value={(done / a.required_calls) * 100} className="h-1.5" />
                    <span className="font-mono text-xs tabular whitespace-nowrap">{done}/{a.required_calls}</span>
                  </div>
                  <form action={deleteAssignment.bind(null, a.id)}>
                    <Button size="sm" variant="ghost" type="submit">Remove</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Calls</TableHead>
              <TableHead>Booked</TableHead>
              <TableHead className="text-right">Avg score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((m) => {
              const st = statsByUser.get(m.user_id);
              const avg = st?.scores.length ? st.scores.reduce((a, b) => a + b, 0) / st.scores.length : null;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {m.profiles?.avatar_url && <AvatarImage src={m.profiles.avatar_url} alt="" />}
                        <AvatarFallback>{initials(m.profiles?.full_name)}</AvatarFallback>
                      </Avatar>
                      <Link href={`/team/${m.user_id}`} className="font-medium hover:underline">{m.profiles?.full_name ?? "—"}</Link>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={m.role === "rep" ? "secondary" : "outline"}>{ROLE_LABEL[m.role]}</Badge></TableCell>
                  <TableCell className="tabular-nums">{st?.calls ?? 0}</TableCell>
                  <TableCell className="tabular-nums">{st?.booked ?? 0}</TableCell>
                  <TableCell className="text-right"><ScorePill value={avg} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
