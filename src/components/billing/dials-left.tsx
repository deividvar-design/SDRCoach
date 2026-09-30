import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Allowance } from "@/lib/billing/allowance";

/** Sidebar counter: what is left of the team pool (managers, trials) or of the rep's own seat. */
export function DialsLeft({ allowance, isManager, formatDate }: { allowance: Allowance | null; isManager: boolean; formatDate: (v: string) => string }) {
  if (!allowance) return null;
  const { left, included, used, over, kind, scope } = allowance;
  const pct = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 100;
  const low = left === 0 || (included > 0 && left / included <= 0.1);
  const title = kind === "trial" ? "Trial dials left" : scope === "you" ? "Your dials left" : "Team dials left";
  const sub =
    kind === "trial"
      ? allowance.daysLeft === 0
        ? "trial ended"
        : `${allowance.daysLeft} day${allowance.daysLeft === 1 ? "" : "s"} left`
      : allowance.resetsAt
        ? `resets ${formatDate(allowance.resetsAt)}`
        : null;

  const body = (
    <>
      <div className="text-muted-foreground flex items-baseline justify-between text-xs">
        <span>{title}</span>
        {sub && <span className="truncate pl-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{sub}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("tabular text-xl leading-none font-medium", low && "text-signal")}>{left}</span>
        <span className="text-muted-foreground text-xs">of {included}</span>
        {over > 0 && <span className="text-muted-foreground ml-auto text-xs">{over} over</span>}
      </div>
      <Progress value={pct} className="mt-2 h-1" indicatorClassName={low ? "bg-signal" : undefined} />
    </>
  );

  const className = "group block rounded-md px-3 py-2";
  const hint = sub ? `${title}: ${left} of ${included}, ${sub}` : undefined;
  return isManager ? (
    <Link href={kind === "trial" ? "/upgrade" : "/settings"} className={cn(className, "hover:bg-accent/60 transition-colors")} title={hint}>
      {body}
    </Link>
  ) : (
    <div className={className} title={hint}>{body}</div>
  );
}
