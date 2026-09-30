"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveTarget, restoreTarget } from "./actions";

/** Managers only. Archiving hides a target from reps; restoring brings it back. Reversible, so no confirm. */
export function ArchiveButton({ id, name, archived, variant = "icon" }: { id: string; name: string; archived: boolean; variant?: "icon" | "text" }) {
  const [busy, start] = useTransition();
  const first = name.split(" ")[0];
  const run = () =>
    start(async () => {
      if (archived) {
        await restoreTarget(id);
        toast.success(`${first} is back on the list`);
      } else {
        await archiveTarget(id);
        toast.success(`${first} archived. Reps no longer see this target.`);
      }
    });
  const Icon = archived ? ArchiveRestore : Archive;
  const label = archived ? "Restore target" : "Archive target";
  if (variant === "text") {
    return (
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={run}>
        <Icon /> {label}
      </Button>
    );
  }
  return (
    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground size-8" disabled={busy} onClick={run} aria-label={label} title={label}>
      <Icon className="size-4" />
    </Button>
  );
}
