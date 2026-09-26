import Link from "next/link";
import { Logo } from "@/components/logo";
import { SITE } from "@/lib/site";
import { CookieSettingsLink } from "@/components/analytics/cookie-banner";

const COLS = [
  { title: "Product", links: [["/for-managers", "For managers"], ["/for-enablement", "For enablement"], ["/pricing", "Pricing"], ["/signup", "Start free trial"]] },
  { title: "Resources", links: [["/blog", "Blog"], ["/blog/best-cold-call-openers", "Cold call openers"], ["/blog/handling-send-me-an-email", "Handling objections"], ["/trust", "Trust & security"]] },
  { title: "Legal", links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"]] },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">{SITE.description}</p>
          <p className="text-muted-foreground text-xs">
            {SITE.company.legalName} · {SITE.company.address}
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="text-muted-foreground mb-3 font-mono text-[11px] tracking-[0.14em] uppercase">{c.title}</div>
            <ul className="space-y-2 text-sm">
              {c.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:underline underline-offset-4">{label}</Link></li>
              ))}
              {c.title === "Legal" && <li><CookieSettingsLink /></li>}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 pb-8 text-xs">
        <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
        <span className="flex gap-4">
          <a href={SITE.social.linkedin} rel="noopener noreferrer" target="_blank" className="hover:underline">LinkedIn</a>
          <a href={SITE.social.x} rel="noopener noreferrer" target="_blank" className="hover:underline">X</a>
          <a href={`mailto:${SITE.company.email}`} className="hover:underline">{SITE.company.email}</a>
        </span>
      </div>
    </footer>
  );
}
