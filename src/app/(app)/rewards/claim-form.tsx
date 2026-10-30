"use client";

import { useActionState, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitClaim, type ClaimState } from "./actions";
import type { RewardKind } from "@/lib/rewards/config";

/** The "Get started" button on a manual card: opens a one-field form for the post link. */
export function ClaimForm({ kind, cta, placeholder }: { kind: RewardKind; cta: string; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ClaimState, FormData>(submitClaim.bind(null, kind), {});

  if (state.submitted) return <p className="text-muted-foreground text-sm">Link received. We check it within a working day and the calls land as soon as it is approved.</p>;
  if (!open) {
    return (
      <Button type="button" className="w-full" onClick={() => setOpen(true)}>
        Get started <ChevronRight />
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <Label htmlFor={`claim-${kind}`} className="sr-only">Link to your post</Label>
      <Input id={`claim-${kind}`} name="url" type="url" required placeholder={placeholder} autoFocus />
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : cta}</Button>
    </form>
  );
}
