import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRIAL } from "@/lib/billing/plans";
import { accessUrl, linkStatus, type LinkStatus } from "@/lib/access/links";
import { formatDate } from "@/lib/utils";
import { parseList, type SearchParams } from "@/lib/admin/list";
import { ListToolbar, Pager } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessLinkForm } from "./link-form";
import { AccessRowActions } from "./row-actions";

export const metadata = { title: "Access links" };
export const dynamic = "force-dynamic";

const PATH = "/admin/access";
const FILTERS = [{ key: "status", label: "Status", options: (["open", "claimed", "expired", "revoked"] as LinkStatus[]).map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })) }];
const STATUS_VARIANT: Record<LinkStatus, "secondary" | "success" | "outline" | "destructive"> = { open: "secondary", claimed: "success", expired: "outline", revoked: "destructive" };

/** Hand-issued access: one link per lead, with the calls you promised them. Opening it creates the account and workspace. */
export default async function AdminAccessPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const state = parseList(await searchParams, ["status"]);
  const db = createAdminClient();
  let query = db.from("access_links").select("*").order("created_at", { ascending: false }).limit(500);
  if (state.q) query = query.or(`email.ilike.%${state.q}%,company.ilike.%${state.q}%`);
  const { data: all } = await query;
  const rows = (all ?? []).filter((l) => !state.filters.status || linkStatus(l) === state.filters.status);
  const page = rows.slice(state.from, state.to + 1);
  const orgIds = page.map((l) => l.org_id).filter((id): id is string => Boolean(id));
  const { data: orgRows } = orgIds.length ? await db.from("organizations").select("id, name, plan").in("id", orgIds) : { data: [] };
  const orgs = new Map((orgRows ?? []).map((o) => [o.id, o]));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Access links" description="Type an email, a company and the calls you promised. The link creates the account and the workspace the moment they choose a password; no signup page, no work-email rule." actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>} />
      <section className="bg-card rounded-2xl border p-6">
        <h2 className="mb-4 font-medium">New link</h2>
        <AccessLinkForm defaultDays={TRIAL.days} />
      </section>
      <section className="bg-card rounded-2xl border">
        <ListToolbar path={PATH} state={state} filters={FILTERS} placeholder="Email or company" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Who</TableHead>
              <TableHead>Allowance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((l) => {
              const status = linkStatus(l);
              const org = l.org_id ? orgs.get(l.org_id) : null;
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.company}</div>
                    <div className="text-muted-foreground text-xs">{l.email}{l.note ? ` · ${l.note}` : ""}</div>
                  </TableCell>
                  <TableCell className="text-sm">{l.calls} calls, {l.days} days</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                    {status === "claimed" && org && <div className="mt-1 text-xs"><Link href={`/admin/orgs/${org.id}`} className="underline underline-offset-4">{org.name}</Link> · {org.plan}</div>}
                    {status === "open" && <div className="text-muted-foreground mt-1 text-xs">until {formatDate(l.expires_at)}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(l.created_at)}<div className="text-xs">{l.created_by}</div></TableCell>
                  <TableCell className="text-right">{status === "open" ? <AccessRowActions id={l.id} link={accessUrl(l.token)} /> : <span className="text-muted-foreground text-xs">{l.claimed_at ? `claimed ${formatDate(l.claimed_at)}` : "—"}</span>}</TableCell>
                </TableRow>
              );
            })}
            {page.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">No links yet. Create one above.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Pager path={PATH} state={state} total={rows.length} />
      </section>
    </div>
  );
}
