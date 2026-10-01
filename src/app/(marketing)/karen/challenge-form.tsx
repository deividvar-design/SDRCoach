"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { challengeKaren, type ChallengeState } from "./actions";

export function ChallengeForm() {
  const [state, action, pending] = useActionState<ChallengeState, FormData>(challengeKaren, {});

  if (state.waitlisted) {
    return (
      <div className="bg-card rounded-2xl border p-6">
        <div className="font-display text-2xl">Karen is busy.</div>
        <p className="text-muted-foreground mt-2 text-sm">She has taken all the calls she will take today. Come back tomorrow, or skip the queue and <Link href="/signup" className="text-foreground underline underline-offset-4">start a free trial</Link>, where she picks up every time.</p>
      </div>
    );
  }

  return (
    <form action={action} className="bg-card space-y-4 rounded-2xl border p-6">
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required autoFocus />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="newsletter" name="newsletter" className="mt-0.5" />
        <Label htmlFor="newsletter" className="cursor-pointer text-sm leading-snug font-normal">Also send me the cold-calling newsletter, one email a fortnight.</Label>
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" size="lg" variant="signal" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Call Karen"}
      </Button>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Work email only, one call per person, three minutes max. We send your scorecard to this address and may follow up about 100 Dials. Unsubscribe in one click. The call is recorded and scored. See the <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
      </p>
    </form>
  );
}
