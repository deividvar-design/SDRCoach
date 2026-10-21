"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CALLBACK_ENABLED, DIAL_CODES, SIGNUP_REASONS } from "@/lib/marketing/signup-intent";
import { createOrganization, type OnboardingState } from "./actions";

const selectClass = "border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none";

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
        <div className="space-y-2">
          <Label htmlFor="signup_reason">Why are you here?</Label>
          <select id="signup_reason" name="signup_reason" required defaultValue="" className={selectClass}>
            <option value="" disabled>Pick one</option>
            {SIGNUP_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup_goal">What would make this worth paying for in 30 days? <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea id="signup_goal" name="signup_goal" rows={2} maxLength={500} placeholder="One sentence is plenty." />
        </div>
        {CALLBACK_ENABLED && (
          <div className="space-y-2">
            <Label htmlFor="phone">Want Karen to call you right now? <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex gap-2">
              <select name="dial_code" defaultValue="+1" aria-label="Country code" className={`${selectClass} w-28`}>
                {DIAL_CODES.map(([cc, code]) => <option key={cc} value={code}>{cc} {code}</option>)}
              </select>
              <Input id="phone" name="phone" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="Mobile number" />
            </div>
            <p className="text-muted-foreground text-xs">One two-minute call from Karen, then a scorecard in your inbox. We never call twice.</p>
          </div>
        )}
        {state.error && <p className="text-destructive text-sm">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </div>
  );
}
