import { SESSION_STATUS } from "@/lib/domain/session-status";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadOrgDetail } from "@/lib/admin/queries";
import { LEVELS } from "@/lib/domain/levels";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { formatUsd } from "@/lib/usage/pricing";
import { formatDate, formatDuration } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScorePill } from "@/components/score-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExtendTrialForm, NoteForm, SetPlanForm } from "./org-actions";

export const metadata = { title: "Admin, workspace" };
export const dynamic = "force-dynamic";

export default async function AdminOrgPage({ params }: PageProps<"/admin/orgs/[id]">) {
  const { id } = await params;
  await requireAdmin();
  const d = await loadOrgDetail(id);
  if (!d) notFound();
  const { org, members, sessions, trial, connected, usageAll, usage30d, actions, emails } = d;

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild><Link href="/admin"><ArrowLeft /> Admin</Link></Button>
      <PageHeader
        eyebrow={`${org.plan.charAt(0).toUpperCase()}${org.plan.slice(1)}${org.subscription_status ? `, ${org.subscription_status.replace("_", " ")}` : ""}, created ${formatDate(org.created_at)}`}
        title={org.name}
        description={[org.trial_domain, org.stripe_customer_id ? `Stripe ${org.stripe_customer_id}` : "No Stripe customer", org.current_period_end ? `${org.cancel_at_period_end ? "ends" : "renews"} ${formatDate(org.current_period_end)}` : null].filter(Boolean).join(", ")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Connected calls" value={connected} hint={trial.onTrial ? `${trial.callsLeft} of ${org.trial_call_limit} trial calls left, ${trial.daysLeft} days` : "Paid plan"} highlight={trial.onTrial && trial.exhausted} />
        <StatTile label="Seats" value={`${members.length} / ${org.seat_limit}`} />
        <StatTile label="Cost, 30 days" value={formatUsd(usage30d.cost)} hint={`${Math.round(usage30d.voiceSeconds / 60)} voice min, ${Math.round((usage30d.input + usage30d.output) / 1000)}k tokens`} />
        <StatTile label="Cost, all time" value={formatUsd(usageAll.cost)} hint={`${Math.round(usageAll.voiceSeconds / 60)} voice min, ${Math.round((usageAll.input + usageAll.output) / 1000)}k tokens`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="bg-card rounded-2xl border p-5"><h2 className="mb-4 font-medium">Extend trial</h2><ExtendTrialForm orgId={org.id} /></section>
        <section className="bg-card rounded-2xl border p-5"><h2 className="mb-4 font-medium">Plan and seats</h2><SetPlanForm orgId={org.id} plan={org.plan} seats={org.seat_limit} /></section>
        <section className="bg-card rounded-2xl border p-5"><h2 className="mb-4 font-medium">Note</h2><NoteForm orgId={org.id} /></section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border">
          <div className="border-b px-5 py-4"><h2 className="font-medium">Members</h2></div>
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.profiles?.full_name ?? "—"}</div>
                  <div className="text-muted-foreground truncate text-xs">{m.email ?? m.user_id}</div>
                </div>
                <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card rounded-2xl border">
          <div className="border-b px-5 py-4"><h2 className="font-medium">History</h2></div>
          <ul className="divide-y text-sm">
            {actions.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{a.action.replaceAll("_", " ")}</span>
                  <span className="text-muted-foreground text-xs">{formatDate(a.created_at)}, {a.admin_email}</span>
                </div>
                {a.payload && <div className="text-muted-foreground mt-1 font-mono text-[11px] break-all">{typeof a.payload === "object" && a.payload && "note" in a.payload ? String((a.payload as { note: string }).note) : JSON.stringify(a.payload)}</div>}
              </li>
            ))}
            {emails.map((e, i) => (
              <li key={`e-${i}`} className="text-muted-foreground flex justify-between px-5 py-3 text-xs">
                <span>email, {e.kind.replaceAll("_", " ")}</span>
                <span>{formatDate(e.sent_at)}</span>
              </li>
            ))}
            {!actions.length && !emails.length && <li className="text-muted-foreground px-5 py-6 text-center text-sm">Nothing yet.</li>}
          </ul>
        </section>
      </div>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Recent calls</h2></div>
        {!sessions.length ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">No calls yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Target</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead>Length</TableHead><TableHead>Outcome</TableHead><TableHead className="text-right">Score</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><Link href={`/sessions/${s.id}`} className="hover:underline">{formatDate(s.created_at)}</Link></TableCell>
                  <TableCell>{s.targets?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">L{LEVELS[s.difficulty].level}</Badge></TableCell>
                  <TableCell><Badge variant={s.status === "scored" ? "success" : s.status === "failed" ? "destructive" : "outline"}>{SESSION_STATUS[s.status].label}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{formatDuration(s.duration_seconds)}</TableCell>
                  <TableCell className="capitalize">{s.outcome?.replaceAll("_", " ") ?? "—"}</TableCell>
                  <TableCell className="text-right"><ScorePill value={s.call_scores?.overall ?? null} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
