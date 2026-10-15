"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinLeaderboard, type LeaderboardState } from "../actions";

export function LeaderboardForm({ joined, name }: { joined: boolean; name: string | null }) {
  const [state, action, pending] = useActionState<LeaderboardState, FormData>(joinLeaderboard, {});
  if (joined || state.joined) {
    return <p className="text-muted-foreground text-sm">You're on this month's leaderboard{name ? ` as ${name}` : ""}. It ranks by time on the line.</p>;
  }
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="display_name">First name</Label>
        <Input id="display_name" name="display_name" autoComplete="given-name" maxLength={30} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="display_company">Company <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="display_company" name="display_company" autoComplete="organization" maxLength={40} />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Join the leaderboard"}</Button>
      {state.error && <p className="text-destructive text-sm sm:col-span-3">{state.error}</p>}
    </form>
  );
}
