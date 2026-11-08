import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { markSeen } from "@/lib/admin/badges";
import { createAdminClient } from "@/lib/supabase/admin";
import { partnerReport, spotsLeft } from "@/lib/partners/program";
import { PARTNER, pilotCalls } from "@/content/founding-partners";
import { formatDate } from "@/lib/utils";
import { parseList, type SearchParams } from "@/lib/admin/list";
import { ListToolbar, Pager } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PartnerStatus } from "@/types/database";
import { PartnerRowActions } from "./row-actions";

export const metadata = { title: "Founding partners" };
export const dynamic = "force-dynamic";
// Approving reads the company website and drafts the workspace, which can take half a minute.
export const maxDuration = 60;

const PATH = "/admin/partners";
const STATUSES: PartnerStatus[] = ["pending", "approved", "completed", "released", "rejected"];
const FILTERS = [{ key: "status", label: "Status", options: STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })) }];
const VARIANT: Record<PartnerStatus, "secondary" | "success" | "outline" | "destructive" | "default"> = { pending: "default", approved: "secondary", completed: "success", released: "outline", rejected: "destructive" };

/** Applications to the founding-partner program, and how each approved pilot is going. */
export default async function AdminPartnersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdmin();
  await markSeen(createAdminClient(), admin.email, "partners");
  const state = parseList(await searchParams, ["status"]);
  const db = createAdminClient();
  let query = db.from("partner_applications").select("*").order("created_at", { ascending: false }).limit(500);
  if (state.q) query = query.or(`email.ilike.%${state.q}%,company.ilike.%${state.q}%,name.ilike.%${state.q}%`);
  const status = STATUSES.find((s) => s === state.filters.status);
  if (status) query = query.eq("status", status);
  const [{ data: all }, left] = await Promise.all([query, spotsLeft(db)]);
  const rows = all ?? [];
  const page = rows.slice(state.from, state.to + 1);

  // For approved pilots: the claimed workspace and how many calls it has made.
  const linkIds = page.map((a) => a.access_link_id).filter((id): id is string => Boolean(id));
  const { data: links } = linkIds.length ? await db.from("access_links").select("id, claimed_at, org_id").in("id", linkIds) : { data: [] };
  const linkById = new Map((links ?? []).map((l) => [l.id, l]));
  const calls = new Map<string, number>();
  for (const l of links ?? []) {
    if (!l.org_id) continue;
    const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", l.org_id).not("started_at", "is", null);
    calls.set(l.org_id, count ?? 0);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal"
        title="Founding partners"
        description={`${left} of ${PARTNER.spots} spots open. Approving issues a ${PARTNER.pilotDays}-day pilot link with ${PARTNER.callsPerRep} calls per rep (up to ${PARTNER.maxReps}), drafted from their website, and emails it. No call ${PARTNER.releaseAfterDays} days after they open it and the spot is released.`}
        actions={<span className="flex gap-4"><Link href="/founding-partners" className="text-sm underline underline-offset-4">Public page</Link><Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link></span>}
      />
      <section className="bg-card rounded-2xl border">
        <ListToolbar path={PATH} state={state} filters={FILTERS} placeholder="Name, email or company" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Who</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Pilot</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((a) => {
              const link = a.access_link_id ? linkById.get(a.access_link_id) : null;
              const made = link?.org_id ? calls.get(link.org_id) ?? 0 : null;
              const report = partnerReport(a);
              return (
                <TableRow key={a.id} className="align-top">
                  <TableCell className="max-w-sm whitespace-normal">
                    <div className="font-medium">{a.company}</div>
                    <div className="text-muted-foreground text-xs">{a.name}{a.role ? `, ${a.role}` : ""} · {a.email}</div>
                    {a.website && <div className="text-xs"><a href={a.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{a.website.replace(/^https?:\/\//, "")}</a></div>}
                    {a.notes && <div className="text-muted-foreground mt-1 max-w-sm text-xs">“{a.notes}”</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{a.sdr_count} SDRs · {pilotCalls(a.sdr_count)} calls</div>
                    <div className="text-muted-foreground text-xs">start by {formatDate(a.start_by)}</div>
                    {a.kickoff_wanted && <div className="text-xs">Kickoff call: {a.kickoff_times || "any time"}</div>}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm whitespace-normal">
                    <Badge variant={VARIANT[a.status]}>{a.status}</Badge>
                    {link && <div className="text-muted-foreground mt-1 text-xs">{link.claimed_at ? `opened ${formatDate(link.claimed_at)} · ${made} calls` : "link not opened yet"}</div>}
                    {link?.org_id && <div className="text-xs"><Link href={`/admin/orgs/${link.org_id}`} className="underline underline-offset-4">Workspace</Link></div>}
                    {report && <div className="mt-1 text-xs">Score {report.firstWeekAvg ?? "-"} → {report.lastWeekAvg ?? "-"} · {report.calls} calls</div>}
                    {a.quote && <div className="mt-1 max-w-xs text-xs">{a.quote_approved_at ? "Approved quote" : "Quote, not approved"}: “{a.quote}”</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(a.created_at)}</TableCell>
                  <TableCell className="text-right">{a.status === "pending" ? <PartnerRowActions id={a.id} company={a.company} /> : <span className="text-muted-foreground text-xs">{a.decided_at ? `${a.status} ${formatDate(a.decided_at)}` : "-"}</span>}</TableCell>
                </TableRow>
              );
            })}
            {page.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">No applications yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Pager path={PATH} state={state} total={rows.length} />
      </section>
    </div>
  );
}
