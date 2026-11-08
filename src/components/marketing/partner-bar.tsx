"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { trackCta } from "@/components/analytics/cta-link";
import { PARTNER } from "@/content/founding-partners";

const KEY = "fp_bar_dismissed";
/** Not on the pages where a visitor is mid-call, reading their scorecard, or already on the program. */
const HIDE_ON = [/^\/karen\/(call|result)/, /^\/founding-partners/, /^\/partner-report/, /^\/welcome\//];

/**
 * One line above the header on the marketing pages: the founding-partner pilot. Hidden once no spots are left. Scrolls
 * away with the page so it never stacks with the sticky Karen bar or the cookie banner. A dismissal is remembered and
 * applied before first paint by the inline script in the marketing layout, so there is no flash and no layout shift.
 */
export function PartnerBar({ spots }: { spots: number | null }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || spots === 0 || HIDE_ON.some((re) => re.test(pathname))) return null;
  const href = "/founding-partners";
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  return (
    <div data-fp-bar className="bg-foreground text-background">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-2 text-sm">
        {/* Phones get the short form, and the whole line is the link so nothing hides behind an ellipsis. */}
        <Link href={href} onClick={() => trackCta("partner_bar", pathname, href)} className="min-w-0 flex-1 truncate sm:hidden">
          <span className="font-medium">Founding teams:</span> a free {PARTNER.pilotDays}-day pilot. <span className="underline underline-offset-4">Apply</span>
        </Link>
        <p className="hidden min-w-0 flex-1 truncate sm:block">
          <span className="font-medium">Founding teams:</span> get a free {PARTNER.pilotDays}-day pilot. We set it up for you.{" "}
          <Link href={href} onClick={() => trackCta("partner_bar", pathname, href)} className="underline underline-offset-4">Apply →</Link>
        </p>
        <button type="button" onClick={dismiss} aria-label="Hide this" className="hover:bg-background/15 shrink-0 rounded-md p-1">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Marks the document before paint when the bar was dismissed earlier; globals.css hides it from that mark. */
export function PartnerBarScript() {
  const code = `(function(){try{if(localStorage.getItem('${KEY}')==='1'){document.documentElement.setAttribute('data-fpbar','off')}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
