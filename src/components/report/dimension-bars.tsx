import { RUBRIC, RUBRIC_KEYS } from "@/lib/scoring/rubric";
import type { ScoreDimensions } from "@/types/database";

/** Horizontal bars, one hue, baseline-anchored, value labelled. Colour is not used to encode the score. */
export function DimensionBars({ dimensions }: { dimensions: ScoreDimensions }) {
  return (
    <dl className="space-y-5">
      {RUBRIC_KEYS.map((key) => {
        const d = dimensions[key];
        const pct = Math.max(0, Math.min(100, (d.score / 10) * 100));
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm font-medium">{RUBRIC[key].label}</dt>
              <span className="font-mono text-sm tabular">{d.score.toFixed(1)}</span>
            </div>
            <div className="bg-muted mt-1.5 h-1.5 w-full overflow-hidden rounded-full" role="img" aria-label={`${RUBRIC[key].label}: ${d.score.toFixed(1)} out of 10`}>
              <div className="bg-foreground h-full rounded-r-[4px]" style={{ width: `${pct}%` }} />
            </div>
            <dd className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{d.rationale}</dd>
          </div>
        );
      })}
    </dl>
  );
}
