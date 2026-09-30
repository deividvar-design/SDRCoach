import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

/**
 * The lockup: a phone mark, the name, and (where the name stands alone) the descriptor underneath.
 * `compact` is the mark only; `descriptor` adds "Cold Call Coach" as an underline.
 */
export function Logo({ className, compact = false, descriptor = false }: { className?: string; compact?: boolean; descriptor?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground relative grid size-7 shrink-0 place-items-center rounded-md">
        <span className="bg-signal absolute top-1 right-1 size-1.5 rounded-full" />
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3.5 2.5h2l1.2 3-1.5 1.2a8 8 0 0 0 4.1 4.1l1.2-1.5 3 1.2v2a1.5 1.5 0 0 1-1.5 1.5A11.5 11.5 0 0 1 2 4a1.5 1.5 0 0 1 1.5-1.5Z" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[19px] tracking-tight">{SITE.name}</span>
          {descriptor && <span className="text-muted-foreground mt-1 text-[10.5px] tracking-wide">{SITE.descriptor}</span>}
        </span>
      )}
    </span>
  );
}
