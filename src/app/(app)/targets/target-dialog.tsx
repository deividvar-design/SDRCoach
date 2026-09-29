"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { VoiceSelect } from "./voice-select";
import { Textarea } from "@/components/ui/textarea";
import { createTarget, type TargetState } from "./actions";

export function TargetDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TargetState, FormData>(async (prev, formData) => {
    const result = await createTarget(prev, formData);
    if (result.ok) {
      toast.success("Target added");
      setOpen(false);
    }
    return result;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New target
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New target</DialogTitle>
          <DialogDescription>Describe the prospect. The more specific, the more realistic the call.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Prospect name</Label>
              <Input id="name" name="name" placeholder="Dana Whitfield" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" name="title" placeholder="VP of Operations" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" placeholder="Northwind Logistics" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" placeholder="Logistics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_size">Company size</Label>
              <Input id="company_size" name="company_size" placeholder="200–500 employees" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kind">Type</Label>
            <Select id="kind" name="kind" defaultValue="real">
              <option value="real">Real account (someone the team is actually calling)</option>
              <option value="practice">Practice persona</option>
            </Select>
          </div>
          <VoiceSelect />
          <div className="space-y-2">
            <Label htmlFor="persona_notes">Persona notes</Label>
            <Textarea id="persona_notes" name="persona_notes" placeholder="Direct, numbers-driven, currently uses a legacy tool, hates being pitched features…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pain_points">Pain points (one per line)</Label>
              <Textarea id="pain_points" name="pain_points" placeholder={"Manual reporting takes days\nDrivers churn every quarter"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objections">Likely objections (one per line)</Label>
              <Textarea id="objections" name="objections" placeholder={"We already have a vendor\nNo budget until next year"} />
            </div>
          </div>
          {state.error && <p className="text-destructive text-sm">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save target"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
