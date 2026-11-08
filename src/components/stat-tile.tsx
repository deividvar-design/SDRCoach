import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KPI tile: label, one hero value, a unit and a hint. Value is always tabular mono. An optional change against an
 * earlier period shows as a green up or red down arrow next to the value. `compact` is the shorter admin size.
 */
export function StatTile({ label, value, unit, hint, icon: Icon, highlight = false, change, compact = false, className }: { label: string; value: string | number; unit?: string; hint?: string; icon?: LucideIcon; highlight?: boolean; change?: number; compact?: boolean; className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl border px-5", compact ? "py-3" : "py-[18px]", highlight && "border-signal", className)}>
      <div className="text-muted-foreground flex items-center justify-between text-[13px]">
        {label}
        {Icon && <Icon className={cn("size-4", highlight && "text-signal-ink")} />}
      </div>
      <div className={cn("flex items-baseline gap-1.5", compact ? "mt-1.5" : "mt-2.5")}>
        <span className={cn("leading-none font-semibold tracking-[-0.03em] tabular-nums", compact ? "text-[26px]" : "text-[34px]")}>{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
        {change !== undefined && change !== 0 && (
          <span className={cn("ml-1 inline-flex items-center gap-0.5 self-center text-sm font-semibold tabular-nums", change > 0 ? "text-success" : "text-destructive")} aria-label={`${change > 0 ? "Up" : "Down"} ${Math.abs(change)}`}>
            {change > 0 ? <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden /> : <ArrowDown className="size-4" strokeWidth={2.5} aria-hidden />}
            {Math.abs(change)}
          </span>
        )}
      </div>
      {hint && <div className={cn("text-foreground/80 text-[13px]", compact ? "mt-1.5" : "mt-2.5")}>{hint}</div>}
    </div>
  );
}
