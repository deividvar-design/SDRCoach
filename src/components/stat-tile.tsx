import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** KPI tile: label, one hero value, a unit and a hint. Value is always tabular mono. */
export function StatTile({ label, value, unit, hint, icon: Icon, highlight = false, className }: { label: string; value: string | number; unit?: string; hint?: string; icon?: LucideIcon; highlight?: boolean; className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl border px-5 py-[18px]", highlight && "border-signal", className)}>
      <div className="text-muted-foreground flex items-center justify-between text-[13px]">
        {label}
        {Icon && <Icon className={cn("size-4", highlight && "text-signal-ink")} />}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
      </div>
      {hint && <div className="text-foreground/80 mt-2.5 text-[13px]">{hint}</div>}
    </div>
  );
}
