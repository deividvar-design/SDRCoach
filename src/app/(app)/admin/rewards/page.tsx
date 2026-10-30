import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { REWARD_BY_KIND, rewardLine, type RewardKind } from "@/lib/rewards/config";
import { formatDate } from "@/lib/utils";
import { parseList, type SearchParams } from "@/lib/admin/list";
import { ListToolbar, Pager } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClaimActions } from "./claim-actions";
import type { RewardClaim } from "@/types/database";

export const metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

const PATH = "/admin/rewards";
const FILTERS = [
  { key: "status", label: "Status", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] },
  { key: "kind", label: "Kind", options: (Object.keys(REWARD_BY_KIND) as RewardKind[]).map((k) => ({ value: k, label: REWARD_BY_KIND[k].title })) },
];

/** Every reward claim. Pending ones first: a pasted post link waits here for a click. */
export default async function AdminRewardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const state = parseList(await searchParams, FILTERS.map((f) => f.key));
  const db = createAdminClient();
  let query = db.from("reward_claims").select("*", { count: "exact" }).order("status", { ascending: false }).order("created_at", { ascending: false });
  if (state.filters.status) query = query.eq("status", state.filters.status as RewardClaim["status"]);
  if (state.filters.kind) query = query.eq("kind", state.filters.kind as RewardKind);
  const [{ data: rows, count }, { count: pending }, { data: granted }] = await Promise.all([
    query.range(state.from, state.to),
    db.from("reward_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("reward_claims").select("calls").eq("status", "approved").limit(5000),
  ]);
  const totalCalls = (granted ?? []).reduce((n, r) => n + r.calls, 0);
  const orgIds = [...new Set((rows ?? []).map((r) => r.org_id))];
  const { data: orgRows } = orgIds.length ? await db.from("organizations").select("id, name, plan").in("id", orgIds) : { data: [] };
  const orgs = new Map((orgRows ?? []).map((o) => [o.id, o]));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Rewards" description="Pasted post links wait here. Approve adds the calls and emails the workspace; reject sends the reason and reopens the card." actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Waiting" value={pending ?? 0} hint="pasted links to check" />
        <StatTile label="Calls granted" value={totalCalls} hint={`about $${(totalCalls * 0.35).toFixed(0)} at today's call lengths`} />
        <StatTile label="Claims" value={count ?? 0} hint="matching the filters" />
      </div>
      <section className="bg-card rounded-2xl border">
        <ListToolbar path={PATH} state={state} filters={FILTERS} placeholder="Search is by filters only" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rows?.length ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">Nothing here.</TableCell></TableRow>
            ) : (
              rows.map((c) => {
                const org = orgs.get(c.org_id) ?? null;
                return (
                  <TableRow key={c.id}>
                    <TableCell><Link href={`/admin/orgs/${c.org_id}`} className="font-medium hover:underline">{org?.name ?? c.org_id}</Link><div className="text-muted-foreground text-xs">{org?.plan}</div></TableCell>
                    <TableCell><div className="text-sm">{REWARD_BY_KIND[c.kind as RewardKind]?.title ?? c.kind}</div><div className="text-muted-foreground text-xs">{rewardLine(c.calls, c.days)}</div></TableCell>
                    <TableCell className="max-w-xs text-xs">{c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">{c.url.replace(/^https?:\/\/(www\.)?/, "")}</a> : <span className="text-muted-foreground">{c.note ?? "automatic"}</span>}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(c.created_at)}</TableCell>
                    <TableCell><Badge variant={c.status === "approved" ? "success" : c.status === "rejected" ? "destructive" : "secondary"}>{c.status}</Badge>{c.status === "rejected" && c.note ? <div className="text-muted-foreground mt-1 text-xs">{c.note}</div> : null}</TableCell>
                    <TableCell className="text-right">{c.status === "pending" ? <div className="flex justify-end"><ClaimActions id={c.id} /></div> : <span className="text-muted-foreground text-xs">{c.decided_by ?? ""}</span>}</TableCell>
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
