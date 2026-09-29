import { formatUsd } from "@/lib/usage/pricing";

/** Thirty daily bars, one hue, baseline-anchored, hover title per bar. */
export function DailyBars({ data, metric }: { data: { key: string; label: string; calls: number; cost: number }[]; metric: "calls" | "cost" }) {
  const max = Math.max(1, ...data.map((d) => d[metric]));
  return (
    <div>
    <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={`${metric} per day, last 30 days`}>
      {data.map((d) => {
        const v = d[metric];
        const h = Math.max(v > 0 ? 3 : 1, (v / max) * 100);
        return (
          <div key={d.key} className="group relative flex h-full flex-1 items-end">
            <div className={v > 0 ? "bg-foreground w-full rounded-t-[3px]" : "bg-muted w-full rounded-t-[3px]"} style={{ height: `${h}%` }} />
            <div className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border px-2 py-1 text-[11px] whitespace-nowrap shadow group-hover:block">
              {d.label}: {metric === "cost" ? formatUsd(v) : `${v} calls`}
            </div>
          </div>
        );
      })}
    </div>
    <details className="mt-3 text-xs">
      <summary className="text-muted-foreground cursor-pointer">Show as a table</summary>
      <table className="mt-2 w-full">
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className="border-t">
              <td className="py-1 pr-4">{d.label}</td>
              <td className="py-1 text-right tabular-nums">{metric === "cost" ? formatUsd(d[metric]) : d[metric]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
    </div>
  );
}
