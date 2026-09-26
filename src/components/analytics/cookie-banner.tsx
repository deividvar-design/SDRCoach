"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OPEN_EVENT, openConsent, readConsent, writeConsent } from "./consent";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!readConsent()) setOpen(true);
    }, 400);
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  if (!open) return null;

  const choose = (analytics: boolean) => {
    writeConsent(analytics);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie choices" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl md:inset-x-auto md:right-6 md:left-auto">
      <div className="bg-popover text-popover-foreground rounded-2xl border p-5 shadow-2xl">
        <div className="font-medium">Cookies</div>
        <p className="text-muted-foreground mt-1 text-sm">
          We use one cookie to keep you signed in. With your OK we also use analytics to see which pages and features get used. No ads, nothing sold. <Link href="/cookies" className="underline underline-offset-4">Details</Link>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => choose(true)}>Accept analytics</Button>
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
