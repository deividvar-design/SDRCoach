"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveClaim, rejectClaim } from "../actions";

/** Approve in one click; reject with an optional reason the person will read. */
export function ClaimActions({ id }: { id: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [pending, start] = useTransition();
  const done = (r: { ok: true } | { error: string }) => {
    if ("error" in r) toast.error(r.error);
    else toast.success("Done");
  };
  if (rejecting) {
    return (
      <form
        className="flex items-center gap-2"
        action={(fd) => start(async () => done(await rejectClaim(id, fd)))}
      >
        <Input name="note" placeholder="Reason, shown to them (optional)" className="h-8 w-64 text-xs" maxLength={200} />
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>Reject</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>Back</Button>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(async () => done(await approveClaim(id)))}>Approve</Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>Reject…</Button>
    </div>
  );
}
