"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const POLL_MS = 4000;

interface Status {
  pending: string[];
  scored: { id: string; overall: number | null; prospect: string }[];
}

/**
 * Sits in the app shell. While any of the viewer's calls is still being reviewed, polls until the
 * score lands, then pops a toast with a link to the report (and a system notification if the tab
 * is hidden and permission was granted). Skips the toast when the report itself is already open.
 */
export function ReviewWatcher({ initialPending }: { initialPending: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const known = useRef(new Set(initialPending));

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      if (stopped) return;
      let status: Status | null = null;
      try {
        const res = await fetch("/api/calls/pending", { cache: "no-store" });
        if (res.ok) status = (await res.json()) as Status;
      } catch {
        /* offline; try again on the next tick */
      }
      if (stopped) return;
      if (status) {
        for (const id of status.pending) known.current.add(id);
        for (const s of status.scored) {
          if (!known.current.has(s.id)) continue;
          known.current.delete(s.id);
          announce(s);
        }
      }
      if (known.current.size > 0) timer = setTimeout(check, POLL_MS);
    };

    const announce = (s: Status["scored"][number]) => {
      const href = `/sessions/${s.id}?fresh=1`;
      const onReport = pathname === `/sessions/${s.id}`;
      const score = s.overall === null ? "" : ` ${s.overall.toFixed(1)}/10`;
      if (!onReport) {
        toast.success("Your review is ready", {
          description: `${s.prospect}${score}`,
          duration: 12000,
          action: { label: "Open", onClick: () => router.push(href) },
        });
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        try {
          const n = new Notification("Your review is ready", { body: `${s.prospect}${score}`, tag: s.id });
          n.onclick = () => {
            window.focus();
            router.push(href);
          };
        } catch {
          /* notifications unavailable */
        }
      }
    };

    // A navigation (for example landing on the report after hanging up) re-checks immediately.
    check();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname, router]);

  return null;
}
