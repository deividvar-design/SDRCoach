import Link from "next/link";
import { Logo } from "@/components/logo";
import { SITE } from "@/lib/site";
import { CookieSettingsLink } from "@/components/analytics/cookie-banner";

const COLS = [
  { title: "Product", links: [["/for-managers", "For managers"], ["/for-enablement", "For enablement"], ["/pricing", "Pricing"], ["/founding-partners", "Founding partners"], ["/signup", "Start free trial"]] },
  { title: "Resources", links: [["/blog", "Blog"], ["/objections", "Objection library"], ["/karen", "Fight Karen"], ["/refer", "Refer a team"], ["/affiliates", "Affiliates"], ["/research", "Research"], ["/trust", "Trust & security"]] },
  { title: "Legal", links: [["/company", "Company"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"]] },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">{SITE.description}</p>
          <p className="text-muted-foreground text-xs">
            {SITE.company.legalName}{SITE.company.address ? `, ${SITE.company.address}` : ""}
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="text-muted-foreground mb-3 text-xs">{c.title}</div>
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
        <span className="flex items-center gap-4">
          <a href="https://1000tools.best/projects/100-dials?utm_source=badge" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- a third-party badge served from their host */}
            <img src="https://1000tools.best/images/badges/featured-on-light.svg" alt="Featured on 1000 Tools" width={160} height={44} loading="lazy" className="h-11 w-auto" />
          </a>
          <a href={`mailto:${SITE.company.email}`} className="hover:underline">{SITE.company.email}</a>
        </span>
      </div>
    </footer>
  );
}
