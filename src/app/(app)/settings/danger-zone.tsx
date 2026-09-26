"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteWorkspace, type SettingsState } from "./actions";

export function DangerZone({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(deleteWorkspace, {});
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-medium">Export your data</div>
          <div className="text-muted-foreground text-sm">Everything in this workspace as one JSON file: members, targets, calls with transcripts and scores, knowledge digests.</div>
        </div>
        <Button variant="outline" asChild><a href="/api/export" download><Download /> Download export</a></Button>
      </div>
      {isOwner && (
        <form action={formAction} className="border-destructive/30 space-y-3 rounded-xl border p-5">
          <div className="font-medium">Delete workspace</div>
          <p className="text-muted-foreground text-sm">Removes every member, target, call, recording reference and uploaded file, permanently. Export first. Type <code className="font-mono">{slug}</code> to confirm.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1"><Label htmlFor="confirm" className="sr-only">Confirmation</Label><Input id="confirm" name="confirm" placeholder={slug} autoComplete="off" /></div>
            <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Deleting…" : "Delete workspace"}</Button>
          </div>
          {state.error && <p className="text-destructive text-sm">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
