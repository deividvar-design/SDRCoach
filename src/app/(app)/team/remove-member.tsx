"use client";

import { useTransition } from "react";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { removeMember } from "./actions";

export function RemoveMemberButton({ membershipId, name }: { membershipId: string; name: string }) {
  const [busy, start] = useTransition();
  return (
    <ConfirmDialog
      trigger={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive size-8" aria-label={`Remove ${name}`} title="Remove from workspace"><UserMinus className="size-4" /></Button>}
      title={`Remove ${name}?`}
      description="They lose access right away and their seat frees up. Their calls, scores and notes stay in the workspace."
      confirmLabel="Remove"
      pending={busy}
      onConfirm={() =>
        start(async () => {
          const r = await removeMember(membershipId);
          if ("error" in r) toast.error(r.error);
          else toast.success(`${name} removed`);
        })
      }
    />
  );
}
