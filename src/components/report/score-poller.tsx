"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_POLLS = 40; // ~2 minutes

/** While the coach is still scoring, refresh the page every few seconds, then stop and say so. */
export function ScorePoller({ active }: { active: boolean }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!active) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > MAX_POLLS) {
        clearInterval(id);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [active, router]);

  if (!active || !gaveUp) return null;
  return <p className="text-muted-foreground text-sm">Scoring is taking longer than usual. It will finish in the background; check back in a few minutes.</p>;
}
