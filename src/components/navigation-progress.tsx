"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Feedback for a page change: a busy cursor from the click until the next page is on screen. Client-side navigation
 * shows no browser spinner, so without this a slow page looks like a dead click.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const safety = useRef<number | undefined>(undefined);

  // A new page is on screen: drop the busy cursor.
  useEffect(() => {
    document.documentElement.removeAttribute("data-navigating");
    window.clearTimeout(safety.current);
  }, [pathname, search]);

  useEffect(() => {
    const start = (url: URL) => {
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      document.documentElement.setAttribute("data-navigating", "");
      // Never leave it spinning if a navigation is cancelled or fails.
      window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => document.documentElement.removeAttribute("data-navigating"), 15000);
    };
    // Capture phase: Next's <Link> cancels the browser's own navigation in its click handler, so by the time the
    // event bubbles up to the document it is already marked as prevented and would be missed.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      start(new URL(a.href, location.href));
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      // Only plain GET forms change page by themselves; server-action forms show their own pending state.
      if (e.defaultPrevented || (form.method || "get").toLowerCase() !== "get" || typeof form.action !== "string") return;
      start(new URL(form.action, location.href));
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return null;
}
