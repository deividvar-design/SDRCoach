import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFeedback, loadOverview, loadWeekly, type WeekNumber } from "@/lib/admin/queries";
import { formatUsd } from "@/lib/usage/pricing";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailyBars } from "@/components/admin/daily-bars";
import { ListToolbar, Pager } from "@/components/admin/list-controls";
import { parseList, slicePage, type SearchParams } from "@/lib/admin/list";
import { adminBadges, totalAction } from "@/lib/admin/badges";
import { AdminNav } from "@/components/admin/admin-nav";
import { countryName, workspaceCountries } from "@/lib/geo";

export const dynamic = "force-dynamic";

/** "(3) Admin" in the tab while three decisions wait. */
export async function generateMetadata() {
  const admin = await requireAdmin();
  const n = totalAction(await adminBadges(createAdminClient(), admin.email));
  return { title: n ? `(${n}) Admin` : "Admin" };
}

const PLAN_VARIANT: Record<string, "secondary" | "success" | "destructive" | "outline"> = { trial: "secondary", starter: "success", team: "success", enterprise: "success", canceled: "destructive" };

const WORKSPACE_FILTERS = [{ key: "plan", label: "Plan", options: ["trial", "starter", "team", "enterprise", "canceled"].map((p) => ({ value: p, label: p })) }];

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdmin();
  const list = parseList(await searchParams, ["plan"]);
  const [{ rows: allRows, totals, tokens, daily }, feedback, badges, countries, week] = await Promise.all([loadOverview(), loadFeedback(), adminBadges(createAdminClient(), admin.email), workspaceCountries(), loadWeekly()]);
  const q = list.q.toLowerCase();
  const matching = allRows.filter((r) => (!list.filters.plan || r.org.plan === list.filters.plan) && (!q || [r.org.name, r.org.trial_domain, r.ownerEmail, countryName(countries.get(r.org.id))].some((v) => v?.toLowerCase().includes(q))));
  const { rows, total } = slicePage(matching, list);
  const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Admin" description="Every workspace, what it uses and what it costs. Actions here are logged." />
      <section className="bg-card rounded-2xl border px-6 py-5">
        <AdminNav badges={badges} />
      </section>

      <section aria-labelledby="this-week" className="space-y-3">
        <h2 id="this-week" className="text-[17px] font-semibold">The last 7 days <span className="text-muted-foreground text-sm font-normal">next to the 7 before</span></h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile compact label="Karen calls" value={week.karenCalls.thisWeek} change={week.karenCalls.thisWeek - week.karenCalls.lastWeek} hint={versus(week.karenCalls)} />
          <StatTile compact label="Karen callers who left an email" value={week.karenEmails.thisWeek} change={week.karenEmails.thisWeek - week.karenEmails.lastWeek} hint={`${share(week.karenEmails.thisWeek, week.karenCalls.thisWeek)}, ${versus(week.karenEmails)}`} />
          <StatTile compact label="Sign-ups" value={week.signups.thisWeek} change={week.signups.thisWeek - week.signups.lastWeek} hint={week.unconfirmed.thisWeek ? `${week.unconfirmed.thisWeek} never confirmed their email, ${versus(week.signups)}` : versus(week.signups)} highlight={week.unconfirmed.thisWeek > 0} />
          <StatTile compact label="New workspaces" value={week.workspaces.thisWeek} change={week.workspaces.thisWeek - week.workspaces.lastWeek} hint={`${week.paying} paying in total, ${versus(week.workspaces)}`} />
          <StatTile compact label="Practice calls scored" value={week.practiceCalls.thisWeek} change={week.practiceCalls.thisWeek - week.practiceCalls.lastWeek} hint={versus(week.practiceCalls)} />
          <StatTile compact label="Meetings booked on practice calls" value={week.booked.thisWeek} change={week.booked.thisWeek - week.booked.lastWeek} hint={versus(week.booked)} />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile compact label="Workspaces" value={totals.orgs} hint={`${totals.trials} trial, ${totals.paid} paid, ${totals.canceled} canceled`} />
        <StatTile compact label="Calls, 30 days" value={totals.calls30d + totals.karen30d} hint={`${totals.calls30d} in workspaces, ${totals.karen30d} Karen`} />
        <StatTile compact label="Est. cost, 30 days" value={formatUsd(totals.cost30d)} hint={`${formatUsd(tokens.voiceCost)} voice, ${formatUsd(tokens.anthropicCost)} scoring`} />
        <StatTile compact label="Tokens, 30 days" value={fmtTokens(tokens.input + tokens.output)} hint={`${fmtTokens(tokens.input)} in, ${fmtTokens(tokens.output)} out, ${fmtTokens(tokens.cacheRead)} cached, ${Math.round(tokens.voiceSeconds / 60)} voice min`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-4 font-medium">Calls per day <span className="text-muted-foreground text-xs font-normal">workspaces and Karen</span></h2>
          <DailyBars data={daily} metric="calls" />
        </section>
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-4 font-medium">Estimated cost per day</h2>
          <DailyBars data={daily} metric="cost" />
        </section>
      </div>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Workspaces</h2></div>
        <ListToolbar path="/admin" state={list} filters={WORKSPACE_FILTERS} placeholder="Name, domain or owner email" />
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
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-muted-foreground py-8 text-center text-sm">Nothing matches.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.org.id}>
                <TableCell>
                  <Link href={`/admin/orgs/${r.org.id}`} className="font-medium hover:underline">{r.org.name}</Link>
                  <div className="text-muted-foreground text-xs">{r.ownerEmail ?? r.org.trial_domain ?? "-"}{countries.has(r.org.id) ? ` · ${countryName(countries.get(r.org.id))}` : ""}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={PLAN_VARIANT[r.org.plan] ?? "outline"} className="capitalize">{r.org.plan}</Badge>
                  {r.org.subscription_status === "past_due" && <Badge variant="destructive" className="ml-1">Past due</Badge>}
                </TableCell>
                <TableCell className="text-xs">
                  {r.trial.onTrial ? (r.trial.exhausted ? <span className="text-destructive">exhausted</span> : `${r.trial.callsLeft} calls, ${r.trial.daysLeft}d left`) : "-"}
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
        <Pager path="/admin" state={list} total={total} />
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
                  <div className="text-muted-foreground mt-1">{f.orgName ?? "-"}{f.role ? `, ${f.role}` : ""}</div>
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

/** The hint under a weekly number; the arrow beside the value carries the change. */
function versus(n: WeekNumber) {
  const d = n.thisWeek - n.lastWeek;
  return d === 0 ? `same as last week (${n.lastWeek})` : `${n.lastWeek} the week before`;
}

function share(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "0%";
}
