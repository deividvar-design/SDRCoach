"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { initials } from "@/lib/utils";

export function UserMenu({ name, email, avatarUrl, role, compact = false, isAdmin = false }: { name: string; email: string; avatarUrl: string | null; role: string; compact?: boolean; isAdmin?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={compact ? "cursor-pointer rounded-full outline-none" : "hover:bg-accent/60 flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left outline-none"} aria-label={compact ? "Account menu" : undefined}>
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{name}</div>
              <div className="text-muted-foreground truncate text-xs">{role}</div>
            </div>
            <ChevronsUpDown className="text-muted-foreground size-4" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-muted-foreground text-xs">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span className="text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin"><ShieldCheck /> Admin console</Link>
          </DropdownMenuItem>
        )}
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
