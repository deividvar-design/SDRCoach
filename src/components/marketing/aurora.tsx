import { cn } from "@/lib/utils";

/**
 * The public site's light columns: soft blue and amber bars behind the navy bands (homepage hero, page tops, the
 * call-to-action bands and the footer). Fixed values so server and client render the same; each bar breathes on its
 * own slow cycle (.hp-bar in globals.css) and stops under reduced motion.
 */
const BARS = [
  [2, 5, "s"], [7, 3, "a"], [11, 6, "s"], [17, 4, "s"], [22, 3, "a"], [27, 7, "s"], [34, 4, "s"], [39, 3, "a"], [44, 6, "s"],
  [51, 4, "s"], [56, 5, "s"], [62, 3, "a"], [67, 6, "s"], [73, 4, "s"], [78, 3, "a"], [83, 6, "s"], [89, 4, "s"], [94, 5, "s"],
] as const;

export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      {BARS.map(([left, width, tone], i) => (
        <span
          key={i}
          className="hp-bar absolute top-[8%] bottom-0"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            background: tone === "a" ? "linear-gradient(to bottom, transparent, rgba(255,177,98,.55) 55%, rgba(255,177,98,.15))" : "linear-gradient(to bottom, transparent, rgba(150,175,205,.32) 50%, rgba(150,175,205,.1))",
            animationDuration: `${6 + (i % 5) * 1.4}s`,
            animationDelay: `${-((i * 1.7) % 9).toFixed(1)}s`,
          }}
        />
      ))}
    </div>
  );
}
