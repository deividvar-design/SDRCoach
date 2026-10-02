"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAV: { href: string; label: string; hot?: boolean }[] = [
  { href: "/#how-it-works", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/karen", label: "Fight Karen", hot: true },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="100 Dials home"><Logo descriptor /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", n.hot ? "text-signal font-medium hover:underline underline-offset-4" : !n.href.includes("#") && pathname.startsWith(n.href) ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
          <Button asChild><Link href="/signup">Start free trial</Link></Button>
        </div>
        <button type="button" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm">{n.label}</Link>
            ))}
          </nav>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" asChild><Link href="/login">Sign in</Link></Button>
            <Button className="flex-1" asChild><Link href="/signup">Start free trial</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}
