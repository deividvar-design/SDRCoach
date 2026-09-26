import { cn } from "@/lib/utils";

export function ScorePill({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span className={cn("text-muted-foreground text-xs", className)}>—</span>;
  const tone = value >= 7.5 ? "bg-success/15 text-success" : value >= 5 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";
  return <span className={cn("inline-flex rounded-md px-2 py-0.5 font-mono text-xs font-medium tabular-nums", tone, className)}>{value.toFixed(1)}</span>;
}
