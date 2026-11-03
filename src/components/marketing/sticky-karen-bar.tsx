"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { trackCta } from "@/components/analytics/cta-link";
import { CONSENT_EVENT, effectiveConsent } from "@/components/analytics/consent";

/** Content pages only. Everything else on the site, and every app screen, never shows the bar. */
const SHOW_ON = [/^\/objections(\/|$)/, /^\/for-enablement$/, /^\/for-managers$/, /^\/blog\/.+/, /^\/pricing$/];
const DISMISSED_KEY = "karen_bar_dismissed";
/** How far down the page the reader has to be before the bar appears. */
const SCROLL_SHARE = 0.25;

/**
 * A phone-only bar at the bottom of content pages offering the free Karen call. It appears once the reader has
 * scrolled a quarter of the page, stays until closed, and the close is remembered for the tab. The spacer keeps the
 * footer's links clear of it.
 */
export function StickyKarenBar() {
  const pathname = usePathname();
  const eligible = SHOW_ON.some((re) => re.test(pathname));
  // The page the reader has scrolled far enough on; a navigation starts the count again.
  const [scrolledOn, setScrolledOn] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const scrolled = scrolledOn === pathname;
  // The cookie banner owns the bottom edge until it is answered; the bar waits its turn.
  const [consentOpen, setConsentOpen] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setConsentOpen(effectiveConsent() === null));
    const onChange = () => setConsentOpen(false);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(CONSENT_EVENT, onChange);
    };
  }, []);

  useEffect(() => {
    if (!eligible) return;
    const check = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0 || window.scrollY / max >= SCROLL_SHARE) setScrolledOn(pathname);
    };
    const raf = requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [eligible, pathname]);

  if (!eligible || dismissed || !scrolled || consentOpen) return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };
  const href = `/karen?from=${encodeURIComponent(pathname)}`;

  return (
    <>
      <div aria-hidden className="h-20 lg:hidden" />
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-300">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            href={href}
            data-cta="sticky_karen"
            onClick={() => trackCta("sticky_karen", pathname, href)}
            className="bg-signal text-signal-foreground focus-visible:ring-ring/50 flex h-12 flex-1 items-center justify-center rounded-xl text-[15px] font-medium outline-none focus-visible:ring-[3px]"
          >
            Call Karen · 3 min · no signup
          </Link>
          <button type="button" onClick={close} aria-label="Close" className="hover:bg-accent focus-visible:ring-ring/50 grid size-11 shrink-0 place-items-center rounded-xl outline-none focus-visible:ring-[3px]">
            <X className="size-5" />
          </button>
        </div>
      </div>
    </>
  );
}
