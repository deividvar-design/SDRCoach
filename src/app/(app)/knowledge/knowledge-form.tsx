"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addKnowledgeText, type KnowledgeState } from "./actions";

export function KnowledgeForm() {
  const [state, formAction, pending] = useActionState<KnowledgeState, FormData>(addKnowledgeText, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      toast.success("Added. The coach will digest it shortly.");
      ref.current?.reset();
    }
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Q3 discovery calls – logistics vertical" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">Type</Label>
          <Select id="kind" name="kind" defaultValue="call_transcript">
            <option value="call_transcript">Call transcript</option>
            <option value="script">Call script</option>
            <option value="playbook">Playbook</option>
            <option value="objection_sheet">Objection sheet</option>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="raw_text">Content</Label>
        <Textarea id="raw_text" name="raw_text" className="min-h-40 font-mono text-xs" placeholder="Paste the transcript or document text…" required />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add to knowledge base"}</Button>
    </form>
  );
}
