import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { loadUsage } from "@/lib/admin/usage";
import { formatUsd } from "@/lib/usage/pricing";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { DailyBars } from "@/components/admin/daily-bars";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Usage" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];
const mins = (m: number) => (m >= 100 ? `${Math.round(m)} min` : `${m.toFixed(1)} min`);
const length = (s: number) => (s ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : "—");

/** Voice minutes and scoring tokens, by day, by workspace and by kind of call. Karen calls included. */
export default async function AdminUsagePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const { days: raw } = await searchParams;
  const days = RANGES.includes(Number(raw)) ? Number(raw) : 30;
  const u = await loadUsage(days);
  const totalCost = u.totals.voiceCost + u.totals.scoringCost;
  const costPerCall = u.totalCalls ? totalCost / u.totalCalls : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal"
        title="Usage"
        description="Every connected call, workspace or Karen, with the voice minutes and scoring tokens it cost. Estimates from the ElevenAgents and Anthropic list prices."
        actions={
          <span className="flex items-center gap-3 text-sm">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/usage?days=${r}`} className={cn("underline-offset-4", r === days ? "font-medium underline" : "text-muted-foreground hover:underline")}>{r} days</Link>
            ))}
            <Link href="/admin" className="text-muted-foreground underline underline-offset-4">Back to admin</Link>
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Connected calls" value={u.totalCalls} hint={`${u.totals.appCalls} in workspaces, ${u.totals.karenCalls} Karen`} />
        <StatTile label="Voice minutes" value={mins(u.totals.minutes)} hint={`average call ${length(u.avgSeconds)}`} />
        <StatTile label="Estimated cost" value={formatUsd(totalCost)} hint={`${formatUsd(u.totals.voiceCost)} voice, ${formatUsd(u.totals.scoringCost)} scoring`} />
        <StatTile label="Per call" value={formatUsd(costPerCall)} hint={`${formatUsd(u.karenCost)} of the total is Karen`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-1 font-medium">Calls per day</h2>
          <p className="text-muted-foreground mb-4 text-xs">Workspace and Karen calls together.</p>
          <DailyBars data={u.daily} metric="calls" />
        </section>
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-1 font-medium">Estimated cost per day</h2>
          <p className="text-muted-foreground mb-4 text-xs">Voice plus scoring, both kinds of call.</p>
          <DailyBars data={u.daily} metric="cost" />
        </section>
      </div>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Karen, last {days} days</h2></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Started" value={u.karen.started} hint={`${u.karen.connected} connected, ${u.karen.scored} scored`} />
          <StatTile label="Left an email" value={u.karen.started ? `${Math.round((u.karen.withEmail / u.karen.started) * 100)}%` : "—"} hint={`${u.karen.withEmail} of ${u.karen.started}, ${u.karen.personal} personal`} />
          <StatTile label="Average score" value={u.karen.avgScore === null ? "—" : u.karen.avgScore.toFixed(1)} hint={`${u.karen.survived} survived, average ${length(u.karen.avgSeconds)}`} />
          <StatTile label="From Google Ads" value={u.karen.fromAds} hint={`${u.karen.rematches} rematch${u.karen.rematches === 1 ? "" : "es"}`} />
        </div>
        <div className="text-muted-foreground grid gap-2 border-t px-5 py-4 text-sm sm:grid-cols-2">
          <div><span className="text-foreground font-medium">Started via:</span> {u.karen.byMethod.map(([k, n]) => `${k} ${n}`).join(", ") || "—"}</div>
          <div><span className="text-foreground font-medium">Outcomes:</span> {u.karen.byOutcome.map(([k, n]) => `${OUTCOME_TEXT[k] ?? k} ${n}`).join(", ") || "—"}</div>
        </div>
      </section>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4"><h2 className="font-medium">By workspace</h2></div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Workspace</TableHead><TableHead className="text-right">Calls</TableHead><TableHead className="text-right">Minutes</TableHead><TableHead className="text-right">Cost</TableHead><TableHead>Last call</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {u.workspaces.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">No workspace calls in this range.</TableCell></TableRow>
            ) : (
              u.workspaces.map((w) => (
                <TableRow key={w.id}>
                  <TableCell><Link href={`/admin/orgs/${w.id}`} className="font-medium hover:underline">{w.name}</Link><div className="text-muted-foreground text-xs">{w.plan}</div></TableCell>
                  <TableCell className="tabular text-right">{w.calls}</TableCell>
                  <TableCell className="tabular text-right">{w.minutes.toFixed(1)}</TableCell>
                  <TableCell className="font-mono text-xs tabular text-right">{formatUsd(w.cost)}</TableCell>
                  <TableCell className="text-xs">{w.lastCall ? formatDate(w.lastCall) : "—"}</TableCell>
                </TableRow>
              ))
            )}
            {u.karenCost > 0 && (
              <TableRow>
                <TableCell><span className="font-medium">Karen (no workspace)</span><div className="text-muted-foreground text-xs">public demo</div></TableCell>
                <TableCell className="tabular text-right">{u.totals.karenCalls}</TableCell>
                <TableCell className="tabular text-right">{(u.karen.avgSeconds * u.karen.connected / 60).toFixed(1)}</TableCell>
                <TableCell className="font-mono text-xs tabular text-right">{formatUsd(u.karenCost)}</TableCell>
                <TableCell className="text-xs">—</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Latest calls</h2></div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>When</TableHead><TableHead>Call</TableHead><TableHead>Status</TableHead><TableHead>Outcome</TableHead><TableHead className="text-right">Length</TableHead><TableHead className="text-right">Score</TableHead><TableHead className="text-right">Cost</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {u.recent.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">No calls in this range.</TableCell></TableRow>
            ) : (
              u.recent.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(c.at)}</TableCell>
                  <TableCell className="text-sm">{c.kind === "app" ? <Link href={`/sessions/${c.id}`} className="hover:underline">{c.who}</Link> : c.who}</TableCell>
                  <TableCell><Badge variant={c.status === "scored" ? "success" : c.status === "failed" ? "destructive" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell className="text-sm">{c.outcome ? OUTCOME_TEXT[c.outcome] ?? c.outcome : "—"}</TableCell>
                  <TableCell className="tabular text-right text-sm">{length(c.seconds)}</TableCell>
                  <TableCell className="tabular text-right">{c.score === null ? "—" : Number(c.score).toFixed(1)}</TableCell>
                  <TableCell className="font-mono text-xs tabular text-right">{formatUsd(c.cost)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <p className="text-muted-foreground text-xs">Tokens in this range: {Math.round(u.totals.tokensIn / 1000)}k in (cached reads included), {Math.round(u.totals.tokensOut / 1000)}k out, over {u.totals.scoringRuns} scoring runs. Karen calls before 1 November carry voice cost only; their scoring tokens were not kept.</p>
    </div>
  );
}
