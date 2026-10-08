"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** A form submitted from a page rendered by an older deployment cannot be matched to an action. A reload fixes it. */
const STALE = /Server Action|router state header/;

export default function AuthError({ error }: { error: Error & { digest?: string } }) {
  const stale = STALE.test(error.message);
  useEffect(() => {
    if (!stale) Sentry.captureException(error);
  }, [error, stale]);
  return (
    <div className="text-center">
      <div className="font-display text-3xl">{stale ? "This page was updated." : "Something broke on our side."}</div>
      <p className="text-muted-foreground mt-2 text-sm">
        {stale ? "Reload and try again. Nothing you typed was lost on our side." : "Try again, and if it keeps happening, email hello@100dials.com with what you were doing."}
      </p>
      {!stale && error.digest && <p className="text-muted-foreground mt-2 font-mono text-xs">ref {error.digest}</p>}
      <Button className="mt-6" onClick={() => window.location.reload()}>Reload</Button>
    </div>
  );
}
