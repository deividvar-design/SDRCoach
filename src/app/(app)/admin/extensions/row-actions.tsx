"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveExtension, declineExtension } from "./actions";

type Result = { ok: string } | { error: string };

export function ExtensionRowActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "approve" | "decline">("idle");
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if ("error" in r) toast.error(r.error);
      else {
        toast.success(r.ok);
        setMode("idle");
      }
    });
  if (mode === "approve") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); run(() => approveExtension(id, new FormData(e.currentTarget))); }} className="flex flex-wrap items-end justify-end gap-2 text-sm">
        <label className="space-y-1"><span className="text-muted-foreground text-xs">Calls</span><Input name="calls" type="number" min={1} max={500} defaultValue={10} className="h-8 w-20" required /></label>
        <label className="space-y-1"><span className="text-muted-foreground text-xs">Days</span><Input name="days" type="number" min={0} max={180} defaultValue={14} className="h-8 w-20" required /></label>
        <Button size="sm" type="submit" variant="signal" disabled={pending}>Add</Button>
        <Button size="sm" type="button" variant="ghost" onClick={() => setMode("idle")}>Cancel</Button>
      </form>
    );
  }
  if (mode === "decline") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); run(() => declineExtension(id, new FormData(e.currentTarget))); }} className="flex flex-wrap items-end justify-end gap-2 text-sm">
        <Input name="note" placeholder="One line for them (optional)" className="h-8 w-64" maxLength={400} />
        <Button size="sm" type="submit" variant="outline" disabled={pending}>Decline</Button>
        <Button size="sm" type="button" variant="ghost" onClick={() => setMode("idle")}>Cancel</Button>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="signal" disabled={pending} onClick={() => setMode("approve")}>Approve</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setMode("decline")}>Decline</Button>
    </div>
  );
}
