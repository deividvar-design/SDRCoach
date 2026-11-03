"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyLink } from "@/app/(app)/team/copy-link";
import { createAccessLink, type AccessLinkState } from "../actions";

/** Email, company, calls: the link is shown here once created and listed below. */
export function AccessLinkForm({ defaultDays }: { defaultDays: number }) {
  const [state, action, pending] = useActionState<AccessLinkState, FormData>(createAccessLink, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="al-email">Email</Label>
          <Input id="al-email" name="email" type="email" required placeholder="lead@company.com" autoComplete="off" spellCheck={false} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="al-company">Company name</Label>
          <Input id="al-company" name="company" required maxLength={80} placeholder="Becomes the workspace name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="al-calls">Calls</Label>
          <Input id="al-calls" name="calls" type="number" min={1} max={1000} defaultValue={10} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="al-days">Trial days</Label>
          <Input id="al-days" name="days" type="number" min={1} max={365} defaultValue={defaultDays} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="al-note">Note, for you only</Label>
          <Input id="al-note" name="note" maxLength={200} placeholder="Where the lead came from, what was promised" />
        </div>
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state.link && (
        <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
          <code className="text-xs break-all">{state.link}</code>
          <CopyLink link={state.link} label="Copy link" />
        </div>
      )}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create link"}</Button>
    </form>
  );
}
