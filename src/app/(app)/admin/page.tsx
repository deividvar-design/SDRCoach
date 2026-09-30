import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { loadFeedback, loadOverview } from "@/lib/admin/queries";
import { formatUsd } from "@/lib/usage/pricing";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailyBars } from "@/components/admin/daily-bars";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const PLAN_VARIANT: Record<string, "secondary" | "success" | "destructive" | "outline"> = { trial: "secondary", starter: "success", team: "success", enterprise: "success", canceled: "destructive" };

export default async function AdminPage() {
  await requireAdmin();
  const [{ rows, totals, tokens, daily }, feedback] = await Promise.all([loadOverview(), loadFeedback()]);
  const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Admin" description="Every workspace, what it uses and what it costs. Actions here are logged." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Workspaces" value={totals.orgs} hint={`${totals.trials} trial, ${totals.paid} paid, ${totals.canceled} canceled`} />
        <StatTile label="Calls, 30 days" value={totals.calls30d} hint={`${totals.calls7d} in the last 7, ${totals.connected30d} connected`} />
        <StatTile label="Est. cost, 30 days" value={formatUsd(totals.cost30d)} hint={`${formatUsd(tokens.voiceCost)} voice, ${formatUsd(tokens.anthropicCost)} scoring`} />
        <StatTile label="Tokens, 30 days" value={fmtTokens(tokens.input + tokens.output)} hint={`${fmtTokens(tokens.input)} in, ${fmtTokens(tokens.output)} out, ${fmtTokens(tokens.cacheRead)} cached, ${Math.round(tokens.voiceSeconds / 60)} voice min`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-4 font-medium">Calls per day</h2>
          <DailyBars data={daily} metric="calls" />
        </section>
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-4 font-medium">Estimated cost per day</h2>
          <DailyBars data={daily} metric="cost" />
        </section>
      </div>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Workspaces</h2></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Calls 30d</TableHead>
              <TableHead>Cost 30d</TableHead>
              <TableHead>Last call</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.org.id}>
                <TableCell>
                  <Link href={`/admin/orgs/${r.org.id}`} className="font-medium hover:underline">{r.org.name}</Link>
                  <div className="text-muted-foreground text-xs">{r.ownerEmail ?? r.org.trial_domain ?? "—"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={PLAN_VARIANT[r.org.plan] ?? "outline"}>{r.org.plan}</Badge>
                  {r.org.subscription_status === "past_due" && <Badge variant="destructive" className="ml-1">past due</Badge>}
                </TableCell>
                <TableCell className="text-xs">
                  {r.trial.onTrial ? (r.trial.exhausted ? <span className="text-destructive">exhausted</span> : `${r.trial.callsLeft} calls, ${r.trial.daysLeft}d left`) : "—"}
                </TableCell>
                <TableCell className="tabular">{r.members} / {r.org.seat_limit}</TableCell>
                <TableCell className="tabular">{r.calls30d}<span className="text-muted-foreground"> ({r.connected30d})</span></TableCell>
                <TableCell className="font-mono text-xs tabular">{formatUsd(r.cost30d)}</TableCell>
                <TableCell className="text-xs">{r.lastCallAt ? formatDate(r.lastCallAt) : "never"}</TableCell>
                <TableCell className="text-xs">{formatDate(r.org.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4">
          <h2 className="font-medium">Feedback</h2>
          <p className="text-muted-foreground text-xs">From the box in the sidebar. Reply by email when they said that is fine.</p>
        </div>
        {feedback.length === 0 ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">Nothing yet.</p>
        ) : (
          <ul className="divide-y">
            {feedback.map((f) => (
              <li key={f.id} className="grid gap-2 px-5 py-4 md:grid-cols-[220px_1fr]">
                <div className="text-xs">
                  <div className="font-medium">{f.name ?? f.email}</div>
                  <div className="text-muted-foreground">{f.reply_ok ? <a href={`mailto:${f.email}`} className="hover:underline">{f.email}</a> : `${f.email} (no reply)`}</div>
                  <div className="text-muted-foreground mt-1">{f.orgName ?? "—"}{f.role ? `, ${f.role}` : ""}</div>
                  <div className="text-muted-foreground">{formatDate(f.created_at)}{f.page ? `, on ${f.page}` : ""}</div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{f.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
