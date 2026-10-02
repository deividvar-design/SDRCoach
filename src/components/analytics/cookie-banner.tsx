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
    <div role="dialog" aria-live="polite" aria-label="Cookie choices" className="bg-popover text-popover-foreground fixed inset-x-0 bottom-0 z-50 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 md:px-6">
        <p className="text-muted-foreground text-xs md:text-sm">
          One cookie keeps you signed in. With your OK, analytics show which pages get used. No ads, nothing sold. <Link href="/cookies" className="underline underline-offset-4">Details</Link>
        </p>
        <div className="flex gap-2">
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
