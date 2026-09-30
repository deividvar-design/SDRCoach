"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="bg-card mx-auto max-w-lg rounded-2xl border p-8 text-center">
      <div className="font-display text-3xl">Something broke on our side.</div>
      <p className="text-muted-foreground mt-2 text-sm">The page hit an error. Your calls and scores are safe. Try again, and if it keeps happening, tell us what you were doing.</p>
      {error.digest && <p className="text-muted-foreground mt-2 font-mono text-xs">ref {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild><a href="/dashboard">Dashboard</a></Button>
      </div>
    </div>
  );
}
