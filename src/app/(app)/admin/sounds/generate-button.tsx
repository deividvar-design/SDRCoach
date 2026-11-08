"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { generateAmbience, type GenerateState } from "./actions";

export function GenerateButton({ kind, exists }: { kind: string; exists: boolean }) {
  const [state, action, pending] = useActionState<GenerateState, FormData>(generateAmbience, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="kind" value={kind} />
      <Button type="submit" size="sm" variant={exists ? "outline" : "default"} disabled={pending}>
        {pending ? "Generating, about 20 seconds…" : exists ? "Regenerate" : "Generate"}
      </Button>
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
      {state.ok && !pending && <p className="text-success text-xs">Saved. New calls use it within five minutes.</p>}
    </form>
  );
}
