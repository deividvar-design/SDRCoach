"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While the coach is still scoring, refresh the page every few seconds. */
export function ScorePoller({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [active, router]);
  return null;
}
