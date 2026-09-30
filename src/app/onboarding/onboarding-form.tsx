"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(createOrganization, {});
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your team</h1>
        <p className="text-muted-foreground text-sm">
          You’ll be the owner. Invite managers and reps from the Team page afterwards.
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" name="name" placeholder="Acme Inc." required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Company website</Label>
          <Input id="website" name="website" inputMode="url" autoComplete="url" placeholder="acme.com" />
          <p className="text-muted-foreground text-xs">We read it once to brief your AI prospects and draft your first buyer. Optional.</p>
        </div>
        {state.error && <p className="text-destructive text-sm">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </div>
  );
}
