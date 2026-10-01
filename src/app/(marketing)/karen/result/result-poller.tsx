"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While the coach is still reviewing, refresh every few seconds and kick a stuck review once. */
export function ResultPoller({ pending }: { pending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      if (ticks % 15 === 0) fetch("/api/demo/finalize", { method: "POST" }).catch(() => {});
      router.refresh();
    }, 3000);
    return () => window.clearInterval(id);
  }, [pending, router]);
  return null;
}
