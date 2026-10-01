import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import { daysAgoIso, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

/** Everyone who called Karen: the demo's lead list. */
export default async function LeadsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: rows } = await db.from("demo_calls").select("id, email, domain, newsletter, status, outcome, overall, duration_seconds, email_sent_at, created_at, error").order("created_at", { ascending: false }).limit(500);
  const leads = rows ?? [];
  const since = daysAgoIso(7);
  const week = leads.filter((l) => l.created_at >= since);
  const scored = leads.filter((l) => l.status === "scored");
  const avg = scored.length ? scored.reduce((n, l) => n + Number(l.overall ?? 0), 0) / scored.length : null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Karen leads" description="Every work email that challenged Karen. Scorecards went to the address shown." actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Leads" value={leads.length} hint={`${week.length} in the last 7 days`} />
        <StatTile label="Completed calls" value={scored.length} hint={`${leads.filter((l) => l.status === "failed").length} failed or capped`} />
        <StatTile label="Average score" value={avg === null ? "—" : avg.toFixed(1)} hint={`${leads.filter((l) => l.newsletter).length} opted into the newsletter`} />
      </div>
      <section className="bg-card rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Length</TableHead>
              <TableHead>Newsletter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">Nobody has called Karen yet.</TableCell></TableRow>
            ) : (
              leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell><a href={`mailto:${l.email}`} className="font-medium hover:underline">{l.email}</a><div className="text-muted-foreground text-xs">{l.domain}</div></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(l.created_at)}</TableCell>
                  <TableCell><Badge variant={l.status === "scored" ? "success" : l.status === "failed" ? "destructive" : "secondary"}>{l.status === "failed" && l.error === "daily cap" ? "capped" : l.status}</Badge></TableCell>
                  <TableCell className="text-sm">{l.outcome ? OUTCOME_TEXT[l.outcome] ?? l.outcome : "—"}</TableCell>
                  <TableCell className="tabular text-right">{l.overall === null ? "—" : Number(l.overall).toFixed(1)}</TableCell>
                  <TableCell className="tabular text-muted-foreground text-right text-sm">{l.duration_seconds ? `${Math.round(l.duration_seconds / 60)}m ${l.duration_seconds % 60}s` : "—"}</TableCell>
                  <TableCell className="text-sm">{l.newsletter ? "Yes" : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
