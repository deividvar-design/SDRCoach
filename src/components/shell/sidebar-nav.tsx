"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, LayoutDashboard, MoreHorizontal, Phone, Settings, Target, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/sessions", label: "Calls", icon: Phone },
  { href: "/team", label: "Team", icon: Users, managerOnly: true },
  { href: "/team/coaching", label: "Coaching", icon: GraduationCap, managerOnly: true },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen, managerOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({ isManager, variant = "sidebar" }: { isManager: boolean; variant?: "sidebar" | "bar" }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.managerOnly || isManager);

  if (variant === "bar") {
    const primary = items.slice(0, 4);
    const overflow = items.slice(4);
    const overflowActive = overflow.some((o) => pathname === o.href || pathname.startsWith(`${o.href}/`));
    const barItem = (active: boolean) =>
      cn("flex flex-col items-center gap-1 py-2 text-[10px] font-medium tracking-wide", active ? "text-foreground" : "text-muted-foreground");
    return (
      <nav className="grid auto-cols-fr grid-flow-col" aria-label="Primary">
        {primary.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={barItem(active)}>
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent")}>
                <item.icon className="size-[18px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className={barItem(overflowActive)} aria-label="More">
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", overflowActive && "bg-accent")}>
                <MoreHorizontal className="size-[18px]" />
              </span>
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="mb-2 min-w-44">
              {overflow.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="size-4" /> {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {items.map((item) => {
        const active = pathname === item.href || (pathname.startsWith(`${item.href}/`) && !items.some((o) => o.href !== item.href && o.href.startsWith(item.href) && pathname.startsWith(o.href)));
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
