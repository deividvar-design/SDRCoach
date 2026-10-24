"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/sections";

/**
 * A form submitted from a page rendered by an older deployment cannot be matched to its action. Marketing pages stay
 * open in tabs for hours and we deploy several times a day, so this is the common failure here. One automatic reload
 * fetches the current deployment; the guard stops a loop if the reload does not help.
 */
const STALE = /Server Action|router state header/;
const GUARD = "100dials:reloaded";

function alreadyReloaded() {
  try {
    return sessionStorage.getItem(GUARD) === location.pathname;
  } catch {
    return true;
  }
}

export default function MarketingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = STALE.test(error.message);
  const [reloading] = useState(() => stale && typeof window !== "undefined" && !alreadyReloaded());

  useEffect(() => {
    if (!stale) {
      Sentry.captureException(error);
      return;
    }
    if (!reloading) return;
    try {
      sessionStorage.setItem(GUARD, location.pathname);
    } catch {}
    window.location.reload();
  }, [error, stale, reloading]);

  return (
    <Section className="pt-14 md:pt-20">
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-4xl text-balance">{stale ? "This page was updated." : "Something broke on our side."}</h1>
        <p className="text-muted-foreground mt-3">
          {reloading ? "Loading the latest version…" : stale ? "Reload and send it again. Nothing you typed reached us." : "Try again, and if it keeps happening, email hello@100dials.com with what you were doing."}
        </p>
        {!stale && error.digest && <p className="text-muted-foreground mt-2 font-mono text-xs">ref {error.digest}</p>}
        {!reloading && (
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            {!stale && <Button variant="outline" onClick={reset}>Try again</Button>}
          </div>
        )}
      </div>
    </Section>
  );
}
