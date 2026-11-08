import { cn } from "@/lib/utils";

/**
 * Light rays along the bottom of a navy brand panel: blurred vertical bars in two blues, every seventh one amber,
 * each breathing on its own slow cycle. Fixed values, so server and client render the same thing.
 */
const RAYS = [79, 80, 67, 81, 104, 136, 92, 78, 111, 107, 123, 141, 88, 94, 150, 119, 117, 111, 86, 107, 150, 110, 92, 76, 92, 99, 125, 84];
const DURATIONS = [6, 7.4, 8.8, 10.2, 11.6];
const BLURS = [8, 12, 16, 20];

export function Rays({ className, height = 170 }: { className?: string; height?: number }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute right-0 bottom-0 -z-10 flex items-end", className)} style={{ height }}>
      {RAYS.map((h, i) => {
        const amber = i % 7 === 3;
        const o = Math.min(0.9, 0.3 + h / 250);
        return (
          <span
            key={i}
            className="ray"
            style={{
              flex: `${[1, 2, 1.5][i % 3]} 1 0`,
              height: Math.round((h / 150) * height * 0.9),
              background: `linear-gradient(to top, ${amber ? "#ffb162" : i % 3 === 1 ? "#a9c2de" : "#8fb0d4"} 0%, transparent 100%)`,
              filter: `blur(${BLURS[i % 4]}px)`,
              opacity: o,
              ["--o" as string]: o,
              ["--d" as string]: `${DURATIONS[i % 5]}s`,
              ["--dl" as string]: `${-((i * 0.53) % 6).toFixed(2)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/** The navy panel with rays: the dashboard greeting, the dialing card, the live call and the overall score. */
export function BrandPanel({ children, className, rays = "right", rayHeight }: { children: React.ReactNode; className?: string; rays?: "right" | "full" | false; rayHeight?: number }) {
  return (
    <section className={cn("brand-panel rounded-3xl", className)}>
      {rays && <Rays className={rays === "full" ? "left-0" : "left-[30%]"} height={rayHeight} />}
      {children}
    </section>
  );
}

/** The call action: amber pill with the dark phone circle. Put it on a Link or a submit button. */
export const callPillClass =
  "inline-flex min-h-[46px] items-center gap-2.5 rounded-full bg-[#ffb162] py-0 pr-2 pl-5 text-[15px] font-semibold text-[#1b2632] outline-none transition-[filter] hover:brightness-105 focus-visible:ring-[3px] focus-visible:ring-[#ffb162]/50";
export const callPillIconClass = "inline-grid size-[30px] place-items-center rounded-full bg-[#1b2632] text-[#ffb162]";
