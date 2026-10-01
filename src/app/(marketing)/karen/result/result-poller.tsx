"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Maximum time the page keeps refreshing before it hands over to the email. */
const MAX_TICKS = 60;

/** While the coach is still reviewing, refresh every few seconds and kick a stuck review now and then. */
export function ResultPoller({ pending }: { pending: boolean }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!pending) return;
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      if (ticks % 15 === 0) fetch("/api/demo/finalize", { method: "POST" }).catch(() => {});
      if (ticks >= MAX_TICKS) {
        window.clearInterval(id);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, 3000);
    return () => window.clearInterval(id);
  }, [pending, router]);
  if (!pending || !gaveUp) return null;
  return <p className="text-muted-foreground mt-6 text-sm">This is taking longer than usual. The report will still arrive by email, usually within a few minutes.</p>;
}
