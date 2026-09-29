"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCall } from "@/app/(app)/sessions/[id]/actions";

export function DeleteCallButton({ sessionId }: { sessionId: string }) {
  const [busy, start] = useTransition();
  return (
    <ConfirmDialog
      trigger={<Button variant="ghost" size="sm"><Trash2 /> Delete</Button>}
      title="Delete this call?"
      description="The transcript, score, notes and recording are removed for good, here and at the voice provider."
      confirmLabel="Delete call"
      pending={busy}
      onConfirm={() =>
        start(async () => {
          const r = await deleteCall(sessionId);
          if (r && "error" in r) toast.error(r.error);
        })
      }
    />
  );
}
