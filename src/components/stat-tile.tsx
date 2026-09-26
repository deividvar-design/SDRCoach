import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** KPI tile: label, one hero value, a unit and a hint. Value is always tabular mono. */
export function StatTile({ label, value, unit, hint, icon: Icon, highlight = false, className }: { label: string; value: string | number; unit?: string; hint?: string; icon?: LucideIcon; highlight?: boolean; className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl border p-5", highlight && "border-signal/40", className)}>
      <div className="text-muted-foreground flex items-center justify-between font-mono text-[11px] tracking-[0.14em] uppercase">
        {label}
        {Icon && <Icon className={cn("size-4", highlight && "text-signal")} />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-4xl leading-none font-medium tabular">{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
      </div>
      {hint && <div className="text-muted-foreground mt-2 text-xs">{hint}</div>}
    </div>
  );
}
