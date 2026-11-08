"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Pauses the animated light columns (Aurora and Rays, marked `data-light`) while they are scrolled out of view. Each
 * one is a stack of blurred bars, so leaving them running below the fold costs frames for nothing.
 */
export function PauseOffscreenLight() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.toggleAttribute("data-offscreen", !e.isIntersecting);
      },
      { rootMargin: "100px" },
    );
    document.querySelectorAll("[data-light]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
