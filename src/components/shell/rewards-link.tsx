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
      className={cn("flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors", active ? "text-foreground bg-white font-semibold shadow-[0_1px_2px_rgba(27,38,50,0.08)] dark:bg-accent dark:shadow-none" : "text-foreground/80 hover:bg-accent/60 hover:text-foreground")}
    >
      <Gift className={cn("size-[18px]", !active && "text-muted-foreground")} strokeWidth={1.7} />
      Rewards
    </Link>
  );
}
