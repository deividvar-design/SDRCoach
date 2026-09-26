"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Phone, Settings, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/sessions", label: "Calls", icon: Phone },
  { href: "/team", label: "Team", icon: Users, managerOnly: true },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen, managerOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({ isManager, variant = "sidebar" }: { isManager: boolean; variant?: "sidebar" | "bar" }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.managerOnly || isManager);

  if (variant === "bar") {
    return (
      <nav className="grid auto-cols-fr grid-flow-col" aria-label="Primary">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[10px] font-medium tracking-wide",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent")}>
                <item.icon className="size-[18px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label === "Home" ? "Dashboard" : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
