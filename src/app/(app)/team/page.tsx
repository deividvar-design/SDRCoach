import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScorePill } from "@/components/score-pill";
import { InviteForm } from "./invite-form";
import { CopyLink } from "./copy-link";
import { RoleSelect } from "./role-select";
import { RemoveMemberButton } from "./remove-member";
import { revokeInvite } from "./actions";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const viewer = await requireManager();
  const supabase = await createClient();

  const [{ data: members }, { data: invites }, { data: sessions }] = await Promise.all([
    supabase.from("memberships").select("*, profiles!memberships_user_id_fkey(full_name, avatar_url, email)").eq("org_id", viewer.org.id).order("created_at"),
    supabase.from("invites").select("*").eq("org_id", viewer.org.id).is("accepted_at", null).order("created_at", { ascending: false }),
    supabase.from("call_sessions").select("user_id, outcome, status, created_at, call_scores(overall)").eq("org_id", viewer.org.id),
  ]);

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

      <section className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Calls</TableHead>
              <TableHead>Booked</TableHead>
              <TableHead className="text-right">Avg score</TableHead>
              <TableHead className="w-10" />
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
                      <div className="min-w-0">
                        <Link href={`/team/${m.user_id}`} className="font-medium hover:underline">{m.profiles?.full_name ?? "—"}</Link>
                        {m.profiles?.email && <div className="text-muted-foreground truncate text-xs">{m.profiles.email}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.role === "owner" || m.user_id === viewer.userId ? (
                      <Badge variant={m.role === "rep" ? "secondary" : "outline"}>{ROLE_LABEL[m.role]}</Badge>
                    ) : (
                      <RoleSelect membershipId={m.id} role={m.role} />
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{st?.calls ?? 0}</TableCell>
                  <TableCell className="tabular-nums">{st?.booked ?? 0}</TableCell>
                  <TableCell className="text-right"><ScorePill value={avg} /></TableCell>
                  <TableCell>
                    {m.role !== "owner" && m.user_id !== viewer.userId && <RemoveMemberButton membershipId={m.id} name={m.profiles?.full_name ?? m.profiles?.email ?? "this member"} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
