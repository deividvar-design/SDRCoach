import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-xs font-bold">
        SC
      </span>
      {!compact && <span>SDRCoach</span>}
    </span>
  );
}
