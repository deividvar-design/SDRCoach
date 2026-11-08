import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

/** The lockup: a phone mark and the name. `compact` is the mark only. */
/** `inverse` is for navy backgrounds: a light mark with a navy phone. */
export function Logo({ className, compact = false, inverse = false }: { className?: string; compact?: boolean; inverse?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("relative grid size-7 shrink-0 place-items-center rounded-md", inverse ? "bg-[#f4f1ea] text-[#1b2632]" : "bg-primary text-primary-foreground")}>
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[#ff4a1c]" />
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3.5 2.5h2l1.2 3-1.5 1.2a8 8 0 0 0 4.1 4.1l1.2-1.5 3 1.2v2a1.5 1.5 0 0 1-1.5 1.5A11.5 11.5 0 0 1 2 4a1.5 1.5 0 0 1 1.5-1.5Z" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[19px] leading-none tracking-tight">{SITE.name}</span>
      )}
    </span>
  );
}
