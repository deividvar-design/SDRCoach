"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { track } from "./provider";

/** Phone or desktop, by the same breakpoint the layout switches on (lg). */
export function deviceKind() {
  return typeof window !== "undefined" && window.innerWidth < 1024 ? "mobile" : "desktop";
}

/** Reports one click on a named call to action. `page` is the path the click happened on. */
export function trackCta(ctaId: string, page: string, href?: string) {
  track("cta_clicked", { cta_id: ctaId, page, device: deviceKind(), ...(href ? { href } : {}) });
}

/** A link that reports `cta_clicked` with its id, the page it sits on and the device, then navigates as usual. */
export function CtaLink({ ctaId, href, onClick, ...rest }: ComponentProps<typeof Link> & { ctaId: string }) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      data-cta={ctaId}
      onClick={(e) => {
        trackCta(ctaId, pathname, typeof href === "string" ? href : undefined);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
