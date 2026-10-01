import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { OBJECTIONS, RUBRIC, RUBRIC_KEYS, type ObjectionKind, type RubricKey } from "@/lib/scoring/rubric";
import { PageHeader } from "@/components/shell/page-header";
import { ScorePill, scoreStep } from "@/components/score-pill";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ScoreDimensions, ScoreObjection } from "@/types/database";

export const metadata = { title: "Coaching" };

/** Kept out of the component body: the lint rule flags Date.now during render. */
function sinceIso(days: number) {
  return new Date(Date.now() - days * DAY).toISOString();
}

const RANGES = { "30": "Last 30 days", "90": "Last 90 days", all: "All time" } as const;
type Range = keyof typeof RANGES;

type Row = {
  id: string;
  user_id: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  call_scores: { overall: number; dimensions: ScoreDimensions; objections: ScoreObjection[] } | { overall: number; dimensions: ScoreDimensions; objections: ScoreObjection[] }[] | null;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const DAY = 86_400_000;

function heat(v: number | null) {
  return v == null ? "text-muted-foreground" : `score-${scoreStep(v)}`;
}

export default async function CoachingPage({ searchParams }: PageProps<"/team/coaching">) {
  const viewer = await requireManager();
  const { range: rawRange } = await searchParams;
  const range: Range = typeof rawRange === "string" && rawRange in RANGES ? (rawRange as Range) : "30";
  const supabase = await createClient();

  const data = await fetchAll<Row>((a, b) => {
    let query = supabase
      .from("call_sessions")
      .select("id, user_id, created_at, profiles(full_name), call_scores(overall, dimensions, objections)")
      .eq("org_id", viewer.org.id)
      .eq("status", "scored")
      .eq("boss", false)
      .order("created_at", { ascending: false });
    if (range !== "all") query = query.gte("created_at", sinceIso(Number(range)));
    return query.range(a, b) as unknown as PromiseLike<{ data: Row[] | null }>;
  });

  const calls = data
    .map((r) => ({ ...r, score: Array.isArray(r.call_scores) ? r.call_scores[0] : r.call_scores }))
    .filter((r) => r.score);

  // ---- Skills: team and per-rep averages per dimension
  const teamDim = Object.fromEntries(RUBRIC_KEYS.map((k) => [k, avg(calls.map((c) => c.score!.dimensions[k].score))])) as Record<RubricKey, number | null>;
  const reps = new Map<string, { name: string; calls: number; overall: number[]; dims: Record<RubricKey, number[]> }>();
  for (const c of calls) {
    const entry = reps.get(c.user_id) ?? { name: c.profiles?.full_name ?? "Rep", calls: 0, overall: [], dims: Object.fromEntries(RUBRIC_KEYS.map((k) => [k, [] as number[]])) as Record<RubricKey, number[]> };
    entry.calls += 1;
    entry.overall.push(c.score!.overall);
    for (const k of RUBRIC_KEYS) entry.dims[k].push(c.score!.dimensions[k].score);
    reps.set(c.user_id, entry);
  }
  const repRows = [...reps.entries()].sort((a, b) => (avg(a[1].overall) ?? 0) - (avg(b[1].overall) ?? 0));
  const weakest = RUBRIC_KEYS.filter((k) => teamDim[k] != null).sort((a, b) => teamDim[a]! - teamDim[b]!);

  // ---- Objections: frequency, handling, who struggles, an example
  type Agg = { kind: ObjectionKind; count: number; calls: Set<string>; handled: number; partial: number; missed: number; missedBy: Map<string, number>; example: { quote: string; sessionId: string; rep: string } | null };
  const objections = new Map<ObjectionKind, Agg>();
  for (const c of calls) {
    for (const o of c.score!.objections ?? []) {
      const kind = (o.kind in OBJECTIONS ? o.kind : "other") as ObjectionKind;
      const a = objections.get(kind) ?? { kind, count: 0, calls: new Set(), handled: 0, partial: 0, missed: 0, missedBy: new Map(), example: null };
      a.count += 1;
      a.calls.add(c.id);
      a[o.handled] += 1;
      if (o.handled !== "handled") a.missedBy.set(c.profiles?.full_name ?? "Rep", (a.missedBy.get(c.profiles?.full_name ?? "Rep") ?? 0) + 1);
      if (!a.example) a.example = { quote: o.quote, sessionId: c.id, rep: c.profiles?.full_name ?? "Rep" };
      objections.set(kind, a);
    }
  }
  const objectionRows = [...objections.values()].sort((a, b) => b.count - a.count);
  // "Other" is the grader saying it found no category, so it never leads the focus card.
  const mostMissed = [...objectionRows].filter((o) => o.count >= 2 && o.kind !== "other").sort((a, b) => (b.missed + b.partial) / b.count - (a.missed + a.partial) / a.count)[0];

  const focus: { title: string; detail: string }[] = [];
  if (weakest[0]) focus.push({ title: `${RUBRIC[weakest[0]].label} is the weakest skill`, detail: `Team average ${teamDim[weakest[0]]!.toFixed(1)}. ${RUBRIC[weakest[0]].description}` });
  if (mostMissed) focus.push({ title: `"${OBJECTIONS[mostMissed.kind].label}" is mishandled most`, detail: `Heard ${mostMissed.count} times, handled cleanly ${mostMissed.handled} of those. ${OBJECTIONS[mostMissed.kind].coaching}` });
  const lowestRep = repRows[0];
  if (lowestRep && repRows.length > 1) {
    const weakDim = RUBRIC_KEYS.map((k) => [k, avg(lowestRep[1].dims[k])] as const).filter(([, v]) => v != null).sort((a, b) => a[1]! - b[1]!)[0];
    if (weakDim) focus.push({ title: `${lowestRep[1].name} needs the most help`, detail: `Averaging ${avg(lowestRep[1].overall)!.toFixed(1)} over ${lowestRep[1].calls} calls. Lowest on ${RUBRIC[weakDim[0]].label.toLowerCase()} (${weakDim[1]!.toFixed(1)}).` });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Coaching"
        description={`${calls.length} reviewed ${calls.length === 1 ? "call" : "calls"} across ${reps.size} ${reps.size === 1 ? "rep" : "reps"}. Where the team struggles and what prospects push back on.`}
        actions={
          <div className="flex gap-1 rounded-full border p-1">
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <Link key={r} href={`/team/coaching?range=${r}`} className={cn("rounded-full px-3 py-1 text-xs", r === range ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                {RANGES[r]}
              </Link>
            ))}
          </div>
        }
      />

      {calls.length === 0 ? (
        <section className="bg-card rounded-2xl border p-8 text-center">
          <div className="font-display text-2xl">Nothing to coach on yet</div>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">This fills in as reps ask for reviews on their calls. Skipped calls keep their transcript and outcome but do not count here.</p>
        </section>
      ) : (
        <>
          {focus.length > 0 && (
            <section className="bg-card paper-grain rounded-2xl border p-6 md:p-8">
              <div className="text-muted-foreground mb-4 text-xs">Focus, {RANGES[range]}</div>
              <ol className="grid gap-5 md:grid-cols-3">
                {focus.map((f) => (
                  <li key={f.title} className="flex gap-3">
                    <div>
                      <div className="font-display text-xl leading-snug">{f.title}</div>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{f.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="bg-card rounded-2xl border">
            <div className="border-b px-6 py-4">
              <h2 className="font-medium">Skills by rep</h2>
              <p className="text-muted-foreground text-sm">Average score per rubric dimension, lowest reps first. Green starts at 7.0, the bar for moving up a level.</p>
              <div className="mt-2 flex items-center gap-1 text-xs" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((s) => <span key={s} className={`score-${s} h-3 w-6 rounded-sm`} />)}
                <span className="text-muted-foreground ml-2">0 → 10</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    {RUBRIC_KEYS.map((k) => (
                      <TableHead key={k} className="text-right">{RUBRIC[k].label}</TableHead>
                    ))}
                    <TableHead className="text-right">Overall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repRows.map(([userId, r], i) => (
                    <TableRow key={userId} className="heat-in" style={{ "--i": i } as React.CSSProperties}>
                      <TableCell className="font-medium"><Link href={`/team/${userId}`} className="hover:underline">{r.name}</Link></TableCell>
                      <TableCell className="text-right tabular">{r.calls}</TableCell>
                      {RUBRIC_KEYS.map((k) => {
                        const v = avg(r.dims[k]);
                        return (
                          <TableCell key={k} className="text-right">
                            <span className={cn("inline-flex min-w-10 justify-center rounded-md px-2 py-0.5 font-mono text-xs tabular", heat(v))}>{v == null ? "—" : v.toFixed(1)}</span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right"><ScorePill value={avg(r.overall)} /></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40">
                    <TableCell className="font-medium">Team</TableCell>
                    <TableCell className="text-right tabular">{calls.length}</TableCell>
                    {RUBRIC_KEYS.map((k) => (
                      <TableCell key={k} className="text-right">
                        <span className={cn("inline-flex min-w-10 justify-center rounded-md px-2 py-0.5 font-mono text-xs font-medium tabular", heat(teamDim[k]))}>{teamDim[k] == null ? "—" : teamDim[k]!.toFixed(1)}</span>
                      </TableCell>
                    ))}
                    <TableCell className="text-right"><ScorePill value={avg(calls.map((c) => c.score!.overall))} /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="bg-card rounded-2xl border">
            <div className="border-b px-6 py-4">
              <h2 className="font-medium">What prospects push back on</h2>
              <p className="text-muted-foreground text-sm">Every objection the coach tagged, most frequent first, and how often the team handled it cleanly.</p>
            </div>
            {objectionRows.length === 0 ? (
              <p className="text-muted-foreground p-6 text-sm">No objections tagged yet. Calls reviewed from now on will show up here.</p>
            ) : (
              <ul className="divide-y">
                {objectionRows.map((o) => {
                  const cleanRate = o.handled / o.count;
                  const strugglers = [...o.missedBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
                  return (
                    <li key={o.kind} className="grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-8">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{OBJECTIONS[o.kind].label}</span>
                          <Badge variant="secondary">{o.count}×</Badge>
                          <span className="text-muted-foreground text-xs">in {o.calls.size} of {calls.length} calls</span>
                        </div>
                        <div className="mt-3 flex h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted" role="img" aria-label={`handled ${o.handled}, partial ${o.partial}, missed ${o.missed}`}>
                          <div className="bg-success h-full" style={{ width: `${(o.handled / o.count) * 100}%` }} />
                          <div className="bg-warning h-full" style={{ width: `${(o.partial / o.count) * 100}%` }} />
                          <div className="bg-destructive h-full" style={{ width: `${(o.missed / o.count) * 100}%` }} />
                        </div>
                        <div className="text-muted-foreground mt-1.5 text-xs">
                          Handled cleanly {Math.round(cleanRate * 100)}%, partial {o.partial}, missed {o.missed}
                          {strugglers.length > 0 && <>, struggles most: {strugglers.map(([n, c]) => `${n} (${c})`).join(", ")}</>}
                        </div>
                        {o.example && (
                          <p className="text-muted-foreground mt-2 text-sm italic">
                            “{o.example.quote}” <Link href={`/sessions/${o.example.sessionId}`} className="text-foreground not-italic text-xs underline underline-offset-4">{o.example.rep}'s call</Link>
                          </p>
                        )}
                      </div>
                      <div className="border-l pl-4 md:pl-6">
                        <div className="text-muted-foreground mb-1 text-[11px]">Coach it with</div>
                        <p className="text-sm leading-relaxed">{OBJECTIONS[o.kind].coaching}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
