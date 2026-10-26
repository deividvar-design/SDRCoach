import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import { daysAgoIso, formatDate } from "@/lib/utils";
import { likeTerm, parseList, type SearchParams } from "@/lib/admin/list";
import { ListToolbar, Pager } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DemoCall } from "@/types/database";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const PATH = "/admin/leads";
const FILTERS = [
  { key: "status", label: "Status", options: [{ value: "scored", label: "Scored" }, { value: "pending", label: "In progress" }, { value: "failed", label: "Failed" }, { value: "capped", label: "Capped" }] },
  { key: "source", label: "Source", options: [{ value: "ads", label: "Google Ads" }, { value: "direct", label: "Direct" }] },
  { key: "email", label: "Email", options: [{ value: "work", label: "Work" }, { value: "personal", label: "Personal" }, { value: "none", label: "None yet" }] },
  { key: "method", label: "Started via", options: [{ value: "call", label: "Call button" }, { value: "google", label: "Google sign-in" }, { value: "email", label: "Email form" }] },
];

const METHOD_LABEL: Record<string, string> = { call: "Call button", google: "Google sign-in", email: "Email form" };
const PENDING: DemoCall["status"][] = ["created", "dialing", "live", "ended", "scoring"];

/** Everyone who called Karen: the demo's lead list, with where each one came from. */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const state = parseList(await searchParams, FILTERS.map((f) => f.key));
  const db = createAdminClient();

  let query = db
    .from("demo_calls")
    .select("id, email, domain, company, personal_email, newsletter, status, outcome, overall, duration_seconds, email_sent_at, email_added_at, created_at, error, method, gclid, gbraid, wbraid", { count: "exact" })
    .order("created_at", { ascending: false });
  if (state.q) {
    const like = likeTerm(state.q.replace(/[(),]/g, " "));
    query = query.or(`email.ilike.${like},domain.ilike.${like},company.ilike.${like}`);
  }
  const f = state.filters;
  if (f.status === "scored") query = query.eq("status", "scored");
  else if (f.status === "pending") query = query.in("status", PENDING);
  else if (f.status === "failed") query = query.eq("status", "failed").neq("error", "daily cap");
  else if (f.status === "capped") query = query.eq("status", "failed").eq("error", "daily cap");
  if (f.source === "ads") query = query.or("gclid.not.is.null,gbraid.not.is.null,wbraid.not.is.null");
  else if (f.source === "direct") query = query.is("gclid", null).is("gbraid", null).is("wbraid", null);
  if (f.email === "work") query = query.not("email", "is", null).eq("personal_email", false);
  else if (f.email === "personal") query = query.eq("personal_email", true);
  else if (f.email === "none") query = query.is("email", null);
  if (f.method) query = query.eq("method", f.method);

  const [{ data: rows, count }, { count: total }, { count: week }, { data: scoredRows }, { count: failed }, { count: newsletter }] = await Promise.all([
    query.range(state.from, state.to),
    db.from("demo_calls").select("id", { count: "exact", head: true }),
    db.from("demo_calls").select("id", { count: "exact", head: true }).gte("created_at", daysAgoIso(7)),
    db.from("demo_calls").select("overall").eq("status", "scored").limit(5000),
    db.from("demo_calls").select("id", { count: "exact", head: true }).eq("status", "failed"),
    db.from("demo_calls").select("id", { count: "exact", head: true }).eq("newsletter", true),
  ]);
  const leads = rows ?? [];
  const scored = scoredRows ?? [];
  const avg = scored.length ? scored.reduce((n, l) => n + Number(l.overall ?? 0), 0) / scored.length : null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Karen leads" description="Everyone who challenged Karen, with where they came from. Scorecards went to the address shown; callers who left before the email step have none." actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Leads" value={total ?? 0} hint={`${week ?? 0} in the last 7 days`} />
        <StatTile label="Completed calls" value={scored.length} hint={`${failed ?? 0} failed or capped`} />
        <StatTile label="Average score" value={avg === null ? "—" : avg.toFixed(1)} hint={`${newsletter ?? 0} opted into the newsletter`} />
      </div>
      <section className="bg-card rounded-2xl border">
        <ListToolbar path={PATH} state={state} filters={FILTERS} placeholder="Email, domain or company" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
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
              <TableRow><TableCell colSpan={8} className="text-muted-foreground py-8 text-center text-sm">{total ? "Nothing matches these filters." : "Nobody has called Karen yet."}</TableCell></TableRow>
            ) : (
              leads.map((l) => {
                const method = l.method ?? (l.email && !l.email_added_at ? "email" : "call");
                const ad = Boolean(l.gclid || l.gbraid || l.wbraid);
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.email ? <a href={`mailto:${l.email}`} className="font-medium hover:underline">{l.email}</a> : <span className="text-muted-foreground">No email yet</span>}
                      <div className="text-muted-foreground text-xs">{l.company ?? l.domain ?? (l.status === "scored" ? "left before the email step" : "")}{l.personal_email ? " · personal" : ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ad ? "success" : "outline"}>{ad ? "Google Ads" : "Direct"}</Badge>
                      <div className="text-muted-foreground mt-1 text-xs">{METHOD_LABEL[method] ?? method}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(l.created_at)}</TableCell>
                    <TableCell><Badge variant={l.status === "scored" ? "success" : l.status === "failed" ? "destructive" : "secondary"}>{l.status === "failed" && l.error === "daily cap" ? "capped" : l.status}</Badge></TableCell>
                    <TableCell className="text-sm">{l.outcome ? OUTCOME_TEXT[l.outcome] ?? l.outcome : "—"}</TableCell>
                    <TableCell className="tabular text-right">{l.overall === null ? "—" : Number(l.overall).toFixed(1)}</TableCell>
                    <TableCell className="tabular text-muted-foreground text-right text-sm">{l.duration_seconds ? `${Math.floor(l.duration_seconds / 60)}m ${l.duration_seconds % 60}s` : "—"}</TableCell>
                    <TableCell className="text-sm">{l.newsletter ? "Yes" : "—"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Pager path={PATH} state={state} total={count ?? 0} />
      </section>
    </div>
  );
}
