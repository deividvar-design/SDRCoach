import Link from "next/link";
import { CtaLink } from "@/components/analytics/cta-link";
import { CookieSettingsLink } from "@/components/analytics/cookie-banner";
import { Aurora } from "@/components/marketing/aurora";
import { bookingUrl } from "@/content/booking";
import { SITE } from "@/lib/site";

const COLS = [
  { title: "Product", links: [["/for-managers", "For managers"], ["/for-enablement", "For enablement"], ["/pricing", "Pricing"], ["/founding-partners", "Founding partners"], ["/signup", "Start free trial"]] },
  { title: "Resources", links: [["/blog", "Blog"], ["/objections", "Objection library"], ["/karen", "Fight Karen"], ["/karen/leaderboard", "Karen leaderboard"], ["/refer", "Refer a team"], ["/affiliates", "Affiliates"], ["/research", "Research"], ["/trust", "Trust & security"]] },
  { title: "Legal", links: [["/company", "Company"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"]] },
] as const;

/**
 * The footer on every public page, homepage included: the closing ask (a call with us, or the trial), then the site
 * links, on one navy block with the light columns. `placement` tags the booking link and the trial click per page.
 */
export function MarketingFooter({ placement = "footer" }: { placement?: string }) {
  return (
    <footer className="relative isolate mx-3 mb-3 overflow-hidden rounded-[28px] bg-[var(--hp-deep)] px-6 pt-20 text-white md:mx-4">
      <Aurora className="[mask-image:linear-gradient(to_top,black,transparent_75%)]" />
      <div className="text-center">
        <h2 className="text-[2.2rem] leading-[1.08] font-semibold tracking-[-0.02em] md:text-[2.8rem]">Tell us about your team<br /><span className="text-white/60">and the accounts they call.</span></h2>
        <p className="mx-auto mt-4 max-w-sm text-[15px] text-white/80">Thirty minutes. We&apos;ll build a prospect from one of your real accounts, and you can call it on the spot.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a href={bookingUrl(placement)} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--hp-deep)]">Book a 30-minute call</a>
          <CtaLink ctaId={`${placement}_trial`} href="/signup" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15">Start free trial</CtaLink>
        </div>
      </div>
      <div className="mx-auto mt-24 grid max-w-6xl gap-8 border-t border-white/12 pt-10 text-sm sm:grid-cols-3">
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="mb-3 text-[12px] text-white/55">{c.title}</div>
            <ul className="space-y-2 text-white/80">
              {c.links.map(([href, label]) => <li key={href}><Link href={href} className="underline-offset-4 hover:text-white hover:underline">{label}</Link></li>)}
              {c.title === "Legal" && <li><CookieSettingsLink /></li>}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-6 text-[12px] text-white/70">
        <span>© {new Date().getFullYear()} {SITE.name}{SITE.company.legalName !== SITE.name ? ` · ${SITE.company.legalName}` : ""}</span>
        <a href={`mailto:${SITE.company.email}`} className="underline underline-offset-4">{SITE.company.email}</a>
      </div>
    </footer>
  );
}
