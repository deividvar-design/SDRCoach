"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OPEN_EVENT, openConsent, writeConsent } from "./consent";

/**
 * The banner is part of the server HTML on every page, hidden by default. The head script (consent-script.tsx)
 * marks the document when a choice is still owed, and a global rule shows the banner at first paint. After a
 * choice it is removed; the footer's "Cookie settings" link opens it again on request.
 */
export function CookieBanner() {
  const [state, setState] = useState<"auto" | "open" | "closed">("auto");

  useEffect(() => {
    const onOpen = () => setState("open");
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (state === "closed") return null;

  const choose = (all: boolean) => {
    writeConsent(all, all);
    document.documentElement.removeAttribute("data-consent");
    setState("closed");
  };

  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie choices" data-consent-banner className="bg-popover text-popover-foreground fixed inset-x-0 bottom-0 z-50 hidden border-t" style={state === "open" ? { display: "block" } : undefined}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 md:px-6">
        <p className="text-muted-foreground text-xs md:text-sm">
          One cookie keeps you signed in. With your OK, analytics show which pages get used and the Google Ads tag measures whether an ad brought you here. Nothing is sold. <Link href="/cookies" className="underline underline-offset-4">Details</Link>
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => choose(true)}>Accept all</Button>
          <Button size="sm" variant="outline" onClick={() => choose(false)}>Only necessary</Button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsLink() {
  return (
    <button type="button" onClick={openConsent} className="cursor-pointer text-sm hover:underline underline-offset-4">
      Cookie settings
    </button>
  );
}
