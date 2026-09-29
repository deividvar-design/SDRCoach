"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestReview, skipReview } from "@/app/(app)/sessions/[id]/actions";

/** After a call: ask before spending a review on it. Reps often already know how it went. */
export function ReviewPrompt({ sessionId, skipped, collecting }: { sessionId: string; skipped: boolean; collecting: boolean }) {
  const [busy, start] = useTransition();

  if (skipped) {
    return (
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>Review skipped.</span>
        <button type="button" className="text-foreground underline underline-offset-4 disabled:opacity-50" disabled={busy} onClick={() => start(() => requestReview(sessionId))}>
          Review it anyway
        </button>
      </div>
    );
  }

  return (
    <section className="bg-card paper-grain flex flex-col gap-5 rounded-2xl border p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div>
        <div className="font-display text-2xl">Want the coach's review?</div>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">
          A scored breakdown with key moments lands in about half a minute. Skip it if you already know how this one went.
          {collecting && " The transcript is still coming in."}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="signal" disabled={busy} onClick={() => start(() => requestReview(sessionId))}>
          <Sparkles /> Review this call
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => start(() => skipReview(sessionId))}>
          Not this one
        </Button>
      </div>
    </section>
  );
}
