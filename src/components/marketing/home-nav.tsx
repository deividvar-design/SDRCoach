"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { CtaLink } from "@/components/analytics/cta-link";
import { SITE } from "@/lib/site";

const NAV = [
  { href: "#how", label: "Product" },
  { href: "/for-managers", label: "For managers" },
  { href: "/objections", label: "Objections" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
];

/** The homepage's header, on the dark hero: the main links on wide screens, a menu on phones. */
export function HomeNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="mx-auto max-w-6xl px-6 py-5">
      <div className="flex items-center justify-between gap-6">
        <Link href="/" aria-label={`${SITE.name} home`} className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
          <span className="relative grid size-7 place-items-center rounded-md bg-white text-[var(--hp-navy)]">
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--hp-peach)]" />
            <Phone className="size-3.5" strokeWidth={2.2} />
          </span>
          {SITE.name}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm text-white/80 md:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="hidden text-white/80 underline-offset-4 hover:text-white hover:underline md:inline">Sign in</Link>
          <button type="button" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 rounded-2xl border border-white/12 bg-[var(--hp-deep)] p-4 md:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {NAV.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 text-[15px]">{n.label}</Link>)}
          </nav>
          <div className="mt-3 flex gap-2">
            <Link href="/login" className="flex-1 rounded-full border border-white/30 py-2.5 text-center text-sm font-medium">Sign in</Link>
            <CtaLink ctaId="home_nav_trial" href="/signup" className="flex-1 rounded-full bg-white py-2.5 text-center text-sm font-semibold text-[var(--hp-navy)]">Start free trial</CtaLink>
          </div>
        </div>
      )}
    </header>
  );
}
