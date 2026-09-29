import { cn } from "@/lib/utils";

/** 0–10 scores on a one-hue ramp: darker is better. Five steps, the top one starting at the level-up threshold. */
export function scoreStep(v: number) {
  return v >= 8.5 ? 5 : v >= 7 ? 4 : v >= 5.5 ? 3 : v >= 4 ? 2 : 1;
}

export function ScorePill({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span className={cn("text-muted-foreground text-xs", className)}>—</span>;
  return <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium tabular-nums", `score-${scoreStep(value)}`, className)}>{value.toFixed(1)}</span>;
}
