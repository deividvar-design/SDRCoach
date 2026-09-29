"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MAX_POLLS = 60; // ~3 minutes
const RETRY_EVERY = 10; // ~30 seconds

/**
 * While the coach is still scoring, refresh the page every few seconds. Every so often, ask the
 * server to retry in case the transcript was not ready the first time. Then stop and say so.
 */
export function ScorePoller({ active, sessionId, doneMessage = "Your review is ready" }: { active: boolean; sessionId?: string; doneMessage?: string | null }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  const [round, setRound] = useState(0);
  const wasActive = useRef(active);

  // The score just landed on this page: say so.
  useEffect(() => {
    if (wasActive.current && !active && doneMessage) toast.success(doneMessage);
    wasActive.current = active;
  }, [active, doneMessage]);

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
      if (sessionId && n % RETRY_EVERY === 0) fetch(`/api/calls/${sessionId}/finalize`, { method: "POST" }).catch(() => {});
      router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [active, router, sessionId, round]);

  if (!active || !gaveUp) return null;
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span>Scoring is taking longer than usual.</span>
      <button
        type="button"
        className="text-foreground underline underline-offset-4"
        onClick={() => {
          if (sessionId) fetch(`/api/calls/${sessionId}/finalize`, { method: "POST" }).catch(() => {});
          setGaveUp(false);
          setRound((r) => r + 1);
          router.refresh();
        }}
      >
        Check again
      </button>
    </p>
  );
}
