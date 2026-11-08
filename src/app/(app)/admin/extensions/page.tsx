import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { markSeen } from "@/lib/admin/badges";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailDomain } from "@/lib/email/business";
import { countTrialCalls } from "@/lib/billing/usage";
import { EXTENSION, EXTENSION_DECIDERS, EXTENSION_TIMELINES, EXTENSION_USE_CASES } from "@/content/trial-growth";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExtensionRowActions } from "./row-actions";

export const metadata = { title: "Trial extensions" };
export const dynamic = "force-dynamic";

const VARIANT = { pending: "default", approved: "success", declined: "outline" } as const;
const label = <T extends { id: string; label: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id)?.label ?? id;

/** Trial workspaces asking for more calls, with their answers and what they have done so far. You set the number. */
export default async function AdminExtensionsPage() {
  const admin = await requireAdmin();
  await markSeen(createAdminClient(), admin.email, "extensions");
  const db = createAdminClient();
  const { data: requests } = await db.from("trial_extension_requests").select("*").order("created_at", { ascending: false }).limit(300);
  const rows = requests ?? [];
  const orgIds = [...new Set(rows.map((r) => r.org_id))];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const [{ data: orgs }, { data: profiles }] = await Promise.all([
    orgIds.length ? db.from("organizations").select("id, name, plan, trial_call_limit, trial_ends_at, trial_domain").in("id", orgIds) : Promise.resolve({ data: [] }),
    userIds.length ? db.from("profiles").select("id, full_name, email").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));
  const userById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const calls = new Map<string, number>();
  for (const id of orgIds) calls.set(id, await countTrialCalls(db, id));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal"
        title="Trial extensions"
        description={`Each request is five answers and the workspace's trial so far. Approve with the calls and days you choose; they land at once and the requester is emailed. A workspace can ask again ${EXTENSION.cooldownDays} days after a decision.`}
        actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>}
      />
      <section className="bg-card rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Who</TableHead>
              <TableHead>Answers</TableHead>
              <TableHead>Trial so far</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const org = orgById.get(r.org_id);
              const user = userById.get(r.user_id);
              const work = user?.email ? classifyEmailDomain(user.email).ok : false;
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="max-w-xs whitespace-normal">
                    <div className="font-medium">{org ? <Link href={`/admin/orgs/${org.id}`} className="underline underline-offset-4">{org.name}</Link> : "Workspace"}</div>
                    <div className="text-muted-foreground text-xs">{user?.full_name || "-"} · {user?.email ?? "-"} {user?.email && !work && <Badge variant="outline" className="ml-1">personal</Badge>}</div>
                    <div className="text-muted-foreground text-xs">asked {formatDate(r.created_at)}</div>
                  </TableCell>
                  <TableCell className="max-w-md text-sm whitespace-normal">
                    <div>{label(EXTENSION_USE_CASES, r.use_case)} · {r.people} {r.people === 1 ? "person" : "people"} · decides: {label(EXTENSION_DECIDERS, r.decider).toLowerCase()} · {label(EXTENSION_TIMELINES, r.timeline).toLowerCase()}</div>
                    {r.need && <div className="text-muted-foreground mt-1">“{r.need}”</div>}
                  </TableCell>
                  <TableCell className="text-sm whitespace-normal">
                    {org ? <div>{calls.get(org.id) ?? 0} of {org.trial_call_limit} calls · ends {formatDate(org.trial_ends_at)}</div> : null}
                    {org?.plan !== "trial" && <div className="text-muted-foreground text-xs">now on {org?.plan}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <ExtensionRowActions id={r.id} />
                    ) : (
                      <div className="text-xs">
                        <Badge variant={VARIANT[r.status]}>{r.status}</Badge>
                        <div className="text-muted-foreground mt-1">{r.status === "approved" ? `+${r.calls} calls, +${r.days} days` : r.note ? `“${r.note}”` : "no note"} · {r.decided_at ? formatDate(r.decided_at) : ""}</div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground py-10 text-center text-sm">No requests yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
