"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveCompanyContext, type OnboardingState } from "../actions";

export function ContextForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(saveCompanyContext, {});
  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="company_description">What your company does</Label>
        <Textarea id="company_description" name="company_description" required placeholder="Brightline sells fleet telematics to mid-market logistics companies." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product_description">What reps are selling on the phone</Label>
        <Textarea id="product_description" name="product_description" required placeholder="A dashboard and driver app that cuts fuel and idle time. Typically $40–80 per vehicle per month. The ask on a cold call is a 15-minute demo." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ideal_customer_profile">Who you call</Label>
        <Textarea id="ideal_customer_profile" name="ideal_customer_profile" required placeholder="VP Ops or fleet managers at 100–1,000 vehicle fleets in freight, last-mile and field services. Trigger events: fleet growth, a new depot, insurance renewals." />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Finish setup"}
      </Button>
    </form>
  );
}
