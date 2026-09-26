"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Target } from "@/types/database";
import { updateTarget, type TargetState } from "../actions";

export function TargetEditForm({ target }: { target: Target }) {
  const [state, formAction, pending] = useActionState<TargetState, FormData>(async (prev, fd) => {
    const r = await updateTarget(target.id, prev, fd);
    if (r.ok) toast.success("Saved");
    return r;
  }, {});

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="name">Prospect name</Label><Input id="name" name="name" defaultValue={target.name} required /></div>
        <div className="space-y-2"><Label htmlFor="title">Job title</Label><Input id="title" name="title" defaultValue={target.title} required /></div>
        <div className="space-y-2"><Label htmlFor="company">Company</Label><Input id="company" name="company" defaultValue={target.company} required /></div>
        <div className="space-y-2"><Label htmlFor="industry">Industry</Label><Input id="industry" name="industry" defaultValue={target.industry ?? ""} /></div>
        <div className="space-y-2"><Label htmlFor="company_size">Company size</Label><Input id="company_size" name="company_size" defaultValue={target.company_size ?? ""} /></div>
        <div className="space-y-2">
          <Label htmlFor="kind">Type</Label>
          <Select id="kind" name="kind" defaultValue={target.kind}>
            <option value="real">Real account</option>
            <option value="practice">Practice persona</option>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label htmlFor="persona_notes">Persona notes</Label><Textarea id="persona_notes" name="persona_notes" defaultValue={target.persona_notes ?? ""} className="min-h-28" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="pain_points">Pain points (one per line)</Label><Textarea id="pain_points" name="pain_points" defaultValue={target.pain_points.join("\n")} className="min-h-28" /></div>
        <div className="space-y-2"><Label htmlFor="objections">Likely objections (one per line)</Label><Textarea id="objections" name="objections" defaultValue={target.objections.join("\n")} className="min-h-28" /></div>
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
    </form>
  );
}
