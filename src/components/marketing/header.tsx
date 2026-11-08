"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAV: { href: string; label: string; hot?: boolean }[] = [
  { href: "/for-managers", label: "For managers" },
  { href: "/for-enablement", label: "For enablement" },
  { href: "/pricing", label: "Pricing" },
  { href: "/objections", label: "Objections" },
  { href: "/blog", label: "Blog" },
  { href: "/karen", label: "Fight Karen", hot: true },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#1b2632]/95 text-[#f4f1ea] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="100 Dials home"><Logo inverse /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors", n.hot ? "font-medium text-[#ffb162] hover:underline underline-offset-4" : !n.href.includes("#") && pathname.startsWith(n.href) ? "bg-white/10 text-white" : "text-white/75 hover:text-white")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" className="text-white/85 hover:bg-white/10 hover:text-white" asChild><Link href="/login">Sign in</Link></Button>
          <Button variant="signal" asChild><Link href="/signup">Start free trial</Link></Button>
        </div>
        <button type="button" className="lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm">{n.label}</Link>
            ))}
          </nav>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild><Link href="/login">Sign in</Link></Button>
            <Button variant="signal" className="flex-1" asChild><Link href="/signup">Start free trial</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}
