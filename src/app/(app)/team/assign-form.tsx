"use client";

import { useActionState, useEffect, useRef } from "react";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { LEVEL_LIST } from "@/lib/domain/levels";
import { dateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createAssignment, type AssignState } from "./actions";

interface Option {
  id: string;
  label: string;
}

export function AssignForm({ reps, targets }: { reps: Option[]; targets: Option[] }) {
  const [state, formAction, pending] = useActionState<AssignState, FormData>(createAssignment, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      toast.success("Assigned. It shows on their dashboard now.");
      ref.current?.reset();
    }
  }, [state]);

  const inAWeek = dateInputValue(7);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_100px_150px]">
        <div className="space-y-2">
          <Label htmlFor="assigned_to">Rep</Label>
          <Select id="assigned_to" name="assigned_to" required defaultValue="">
            <option value="" disabled>Choose a rep</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_id">Target</Label>
          <Select id="target_id" name="target_id" required defaultValue="">
            <option value="" disabled>Choose a target</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="difficulty">Level</Label>
          <Select id="difficulty" name="difficulty" defaultValue="warm">
            {LEVEL_LIST.map((l) => <option key={l.id} value={l.id}>L{l.level} {l.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="required_calls">Calls</Label>
          <Input id="required_calls" name="required_calls" type="number" min={1} max={20} defaultValue={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_at">Due</Label>
          <Input id="due_at" name="due_at" type="date" defaultValue={inAWeek} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note for the rep (optional)</Label>
        <Input id="note" name="note" placeholder="Before the Petram sequence starts. Focus on the reason-for-call line." />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        <ClipboardList /> {pending ? "Assigning…" : "Assign"}
      </Button>
    </form>
  );
}
