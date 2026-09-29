"use client";

import { useEffect, useState } from "react";



/** Hero score. Counts up on first view so the number lands like a result, not a label. */
export function ScoreReveal({ value, animate }: { value: number; animate: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const duration = reduce ? 0 : 1100;
    let raf = 0;
    const tick = (now: number) => {
      const p = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-foreground text-7xl leading-none font-semibold tracking-tight">{shown.toFixed(1)}</span>
      <span className="text-muted-foreground text-lg">/ 10</span>
    </div>
  );
}
