"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Organization, Profile } from "@/types/database";
import { updateOrganization, updateProfile, updateTeamVisibility, type SettingsState } from "./actions";

function useToastOnOk(state: SettingsState) {
  useEffect(() => {
    if (state.ok) toast.success("Saved");
  }, [state]);
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateProfile, {});
  useToastOnOk(state);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Your name</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} required />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" variant="outline" disabled={pending}>Save</Button>
    </form>
  );
}

export function OrganizationForm({ org }: { org: Organization }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateOrganization, {});
  useToastOnOk(state);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" defaultValue={org.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_description">What your company does</Label>
        <Textarea id="company_description" name="company_description" defaultValue={org.company_description ?? ""} placeholder="One or two sentences. The AI prospect will know this much about you, the same as a real one would after a quick glance at your website." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product_description">What reps are selling</Label>
        <Textarea id="product_description" name="product_description" defaultValue={org.product_description ?? ""} placeholder="The product, the outcome it delivers, typical pricing shape." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ideal_customer_profile">Ideal customer profile</Label>
        <Textarea id="ideal_customer_profile" name="ideal_customer_profile" defaultValue={org.ideal_customer_profile ?? ""} placeholder="Company size, industries, the titles you call, the trigger events you look for." />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}

export function TeamVisibilityForm({ org }: { org: Organization }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateTeamVisibility, {});
  useEffect(() => {
    if (state.ok) toast.success("Saved");
  }, [state]);
  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="reps_see_team" defaultChecked={org.reps_see_team} className="mt-0.5" />
        <span>
          <span className="font-medium">Reps can see each other's calls and scores</span>
          <span className="text-muted-foreground block text-xs">On: the leaderboard links to every teammate's page, the Calls list gets a Team view, and reports open read-only for the whole team. Off: reps see only their own calls. Managers always see everything.</span>
        </span>
      </label>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
