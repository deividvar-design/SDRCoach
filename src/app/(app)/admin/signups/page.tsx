import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { reasonLabel } from "@/lib/marketing/signup-intent";
import { daysAgoIso, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Signups" };
export const dynamic = "force-dynamic";

/** Everyone who created an account, with what they said they came for and whether they dialed. */
export default async function SignupsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: profiles }, { data: memberships }, { data: calls }] = await Promise.all([
    db.from("profiles").select("id, full_name, email, signup_reason, signup_goal, hero_variant, phone, created_at").order("created_at", { ascending: false }).limit(500),
    db.from("memberships").select("user_id, role, org_id, organizations(name, trial_domain, plan)").limit(2000),
    db.from("call_sessions").select("user_id").not("started_at", "is", null).limit(20000),
  ]);
  const orgOf = new Map((memberships ?? []).map((m) => [m.user_id, m]));
  const callsBy = new Map<string, number>();
  for (const c of calls ?? []) callsBy.set(c.user_id, (callsBy.get(c.user_id) ?? 0) + 1);
  const rows = profiles ?? [];
  const week = rows.filter((r) => r.created_at >= daysAgoIso(7));
  const dialed = rows.filter((r) => (callsBy.get(r.id) ?? 0) > 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Signups" description="Every account, why they said they came, and whether they have dialed." actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Accounts" value={rows.length} hint={`${week.length} in the last 7 days`} />
        <StatTile label="Dialed at least once" value={dialed.length} hint={rows.length ? `${Math.round((dialed.length / rows.length) * 100)}% of accounts` : "—"} />
        <StatTile label="Ramping new SDRs" value={rows.filter((r) => r.signup_reason === "ramping").length} hint={`${rows.filter((r) => r.signup_reason === "karen").length} just want to fight Karen`} />
      </div>
      <section className="bg-card rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Why here</TableHead>
              <TableHead>Worth paying for</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead>Signed up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">No accounts yet.</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const m = orgOf.get(r.id);
                const org = m?.organizations;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name ?? "—"}</div>
                      <div className="text-muted-foreground text-xs">{r.email ? <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a> : "—"}{r.phone ? ` · ${r.phone}` : ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{org?.name ?? "—"}{m?.role ? <span className="text-muted-foreground"> · {m.role}</span> : null}</div>
                      <div className="text-muted-foreground text-xs">{org?.trial_domain ?? ""}{org?.plan ? ` · ${org.plan}` : ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">{reasonLabel(r.signup_reason) ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs text-xs">{r.signup_goal ?? "—"}</TableCell>
                    <TableCell>{r.hero_variant ? <Badge variant="secondary">{r.hero_variant}</Badge> : "—"}</TableCell>
                    <TableCell className="tabular text-right">{callsBy.get(r.id) ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(r.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
