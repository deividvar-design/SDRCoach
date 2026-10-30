"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bottom-left of the sidebar, above the dials counter: the way to earn more of them. */
export function RewardsLink() {
  const active = usePathname().startsWith("/rewards");
  return (
    <Link
      href="/rewards"
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors", active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
    >
      <Gift className="size-4" />
      Rewards
    </Link>
  );
}
