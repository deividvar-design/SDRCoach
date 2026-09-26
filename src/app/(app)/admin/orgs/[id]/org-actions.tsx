"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addNote, extendTrial, setPlan, type AdminState } from "../../actions";

function Result({ state }: { state: AdminState }) {
  if (state.error) return <p className="text-destructive text-sm">{state.error}</p>;
  if (state.ok) return <p className="text-success text-sm">{state.ok}</p>;
  return null;
}

export function ExtendTrialForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(extendTrial.bind(null, orgId), {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label htmlFor="days">Add days</Label><Input id="days" name="days" type="number" min={0} defaultValue={14} /></div>
        <div className="space-y-1"><Label htmlFor="calls">Add calls</Label><Input id="calls" name="calls" type="number" min={0} defaultValue={10} /></div>
      </div>
      <Result state={state} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Saving…" : "Extend trial"}</Button>
    </form>
  );
}

export function SetPlanForm({ orgId, plan, seats }: { orgId: string; plan: string; seats: number }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(setPlan.bind(null, orgId), {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="plan">Plan</Label>
          <Select id="plan" name="plan" defaultValue={plan}>
            {["trial", "starter", "team", "enterprise", "canceled"].map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div className="space-y-1"><Label htmlFor="seat_limit">Seats</Label><Input id="seat_limit" name="seat_limit" type="number" min={1} defaultValue={seats} /></div>
      </div>
      <p className="text-muted-foreground text-xs">Overrides the app's view only. Stripe is not touched; use it for comps, enterprise deals and fixes.</p>
      <Result state={state} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Saving…" : "Set plan"}</Button>
    </form>
  );
}

export function NoteForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(addNote.bind(null, orgId), {});
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1"><Label htmlFor="note">Note</Label><Textarea id="note" name="note" placeholder="Spoke to the owner, wants an enterprise quote for 30 seats…" /></div>
      <Result state={state} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Saving…" : "Add note"}</Button>
    </form>
  );
}
