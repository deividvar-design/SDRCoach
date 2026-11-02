import { cn } from "@/lib/utils";

/**
 * "Works with transcripts from" strip. The marks are typographic wordmarks in each brand's colour, not the companies'
 * own logo files, so nothing is redistributed and the strip stays legible at any size. Swap in official SVGs by
 * replacing a mark below; keep the sizing.
 */
const MARKS: { name: string; mark: React.ReactNode }[] = [
  {
    name: "Gong",
    mark: (
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden><circle cx="12" cy="12" r="10" fill="#8039DF" /><circle cx="12" cy="12" r="4.5" fill="#fff" /></svg>
        <span className="text-[17px] font-semibold tracking-tight" style={{ color: "#5B21B6" }}>Gong</span>
      </span>
    ),
  },
  {
    name: "Chorus",
    mark: (
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden><rect x="3" y="9" width="3" height="6" rx="1.5" fill="#E8512F" /><rect x="8.5" y="5" width="3" height="14" rx="1.5" fill="#E8512F" /><rect x="14" y="7" width="3" height="10" rx="1.5" fill="#E8512F" /><rect x="19.5" y="10" width="3" height="4" rx="1.5" fill="#E8512F" /></svg>
        <span className="text-[17px] font-semibold tracking-tight" style={{ color: "#C2410C" }}>Chorus</span>
      </span>
    ),
  },
  {
    name: "Apollo",
    mark: (
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path d="M12 2 2 22h20L12 2Zm0 5.2L17.6 19H6.4L12 7.2Z" fill="#111827" /></svg>
        <span className="text-[17px] font-semibold tracking-tight" style={{ color: "#111827" }}>Apollo</span>
      </span>
    ),
  },
];

export function TranscriptSources({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-3", className)} aria-label="Works with transcripts from Gong, Chorus, Apollo and your dialler">
      <span className="text-muted-foreground text-sm">Works with transcripts from</span>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {MARKS.map((m) => (
          <li key={m.name} className={cn("opacity-90", compact && "scale-90")} title={m.name}>{m.mark}</li>
        ))}
        <li className="text-muted-foreground text-sm">and your dialler</li>
      </ul>
    </div>
  );
}
