"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MAX_POLLS = 60; // ~3 minutes
const RETRY_EVERY = 10; // ~30 seconds

/**
 * While the coach is still scoring, check every few seconds and refresh the page when the call moves on (transcript
 * in, score in). Every so often, ask the server to retry in case the transcript was not ready the first time. Then
 * stop and say so.
 */
export function ScorePoller({ active, sessionId, state, doneMessage = "Your review is ready" }: { active: boolean; sessionId?: string; state?: string; doneMessage?: string | null }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  const [round, setRound] = useState(0);
  const wasActive = useRef(active);
  // Where the call stood when this page was rendered, in the status endpoint's terms.
  const shown = useRef(state ?? null);
  useEffect(() => {
    shown.current = state ?? null;
  }, [state]);

  // The score just landed on this page: say so.
  useEffect(() => {
    if (wasActive.current && !active && doneMessage) toast.success(doneMessage);
    wasActive.current = active;
  }, [active, doneMessage]);

  useEffect(() => {
    if (!active) return;
    let n = 0;
    const id = setInterval(async () => {
      n += 1;
      if (n > MAX_POLLS) {
        clearInterval(id);
        setGaveUp(true);
        return;
      }
      if (!sessionId) {
        router.refresh();
        return;
      }
      if (n % RETRY_EVERY === 0) fetch(`/api/calls/${sessionId}/finalize`, { method: "POST" }).catch(() => {});
      // Ask the cheap status endpoint first and re-render the page only when something on it has moved.
      const state = await fetch(`/api/calls/${sessionId}/status`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { state?: string | null } | null) => j?.state ?? null)
        .catch(() => null);
      if (state === null || state !== shown.current) {
        shown.current = state;
        router.refresh();
      }
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
