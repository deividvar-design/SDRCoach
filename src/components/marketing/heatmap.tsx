import { RUBRIC, RUBRIC_KEYS } from "@/lib/scoring/rubric";
import { OBJECTIONS } from "@/lib/scoring/rubric";
import { cn } from "@/lib/utils";

/** Example data. Placeholder reps, illustrative scores, labelled as such on the page. Never customer results. */
const REPS: { name: string; scores: number[] }[] = [
  { name: "Rep A", scores: [6.1, 5.2, 4.4, 3.9, 5.8, 4.1] },
  { name: "Rep B", scores: [7.4, 6.8, 5.1, 4.6, 6.2, 5.0] },
  { name: "Rep C", scores: [8.0, 7.1, 6.6, 5.9, 6.9, 6.4] },
  { name: "Rep D", scores: [7.8, 7.9, 7.2, 6.8, 7.4, 7.0] },
  { name: "Rep E", scores: [8.6, 8.2, 7.9, 7.5, 8.1, 7.8] },
];
const RANKED: (keyof typeof OBJECTIONS)[] = ["send_email", "already_have_solution", "no_time", "not_decision_maker", "price"];

function cell(score: number) {
  // Weak scores burn hot; strong ones fade to paper. Same hue, one axis.
  const t = Math.max(0, Math.min(1, (8.5 - score) / 4.5));
  return { background: `color-mix(in oklch, var(--signal) ${Math.round(t * 85)}%, var(--card))`, color: t > 0.5 ? "var(--signal-foreground)" : "var(--foreground)" };
}

export function Heatmap() {
  // Weakest skill first, judged across the example team.
  const order = RUBRIC_KEYS.map((k, i) => ({ k, i, avg: REPS.reduce((n, r) => n + (r.scores[i] ?? 0), 0) / REPS.length })).sort((a, b) => a.avg - b.avg);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-medium">Skills by rep</span>
          <span className="dial text-muted-foreground text-[11px]">EXAMPLE DATA</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr>
                <th className="text-muted-foreground px-3 py-2 text-left font-normal">Weakest first</th>
                {REPS.map((r) => <th key={r.name} className="text-muted-foreground px-2 py-2 text-right font-normal">{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {order.map(({ k, i }) => (
                <tr key={k} className="border-t">
                  <td className="px-3 py-2 font-medium">{RUBRIC[k].label}</td>
                  {REPS.map((r) => (
                    <td key={r.name} className="p-1">
                      <div className={cn("dial rounded-md px-2 py-2 text-right text-[11px]")} style={cell(r.scores[i] ?? 0)}>{(r.scores[i] ?? 0).toFixed(1)}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-card rounded-2xl border">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-medium">What the team loses on</span>
          <span className="dial text-muted-foreground text-[11px]">RANKED</span>
        </div>
        <ol className="divide-y">
          {RANKED.map((k, i) => (
            <li key={k} className="flex gap-3 px-4 py-3">
              <span className="dial text-signal pt-0.5 text-xs">0{i + 1}</span>
              <div>
                <div className="text-sm font-medium">{OBJECTIONS[k].label}</div>
                <div className="text-muted-foreground mt-0.5 text-xs">{OBJECTIONS[k].coaching}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
