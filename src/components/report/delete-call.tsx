"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCall } from "@/app/(app)/sessions/[id]/actions";

export function DeleteCallButton({ sessionId }: { sessionId: string }) {
  const [busy, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={() => {
        if (window.confirm("Delete this call, its transcript, score and recording? This cannot be undone.")) start(async () => {
          const r = await deleteCall(sessionId);
          if (r && "error" in r) toast.error(r.error);
        });
      }}
    >
      <Trash2 /> Delete
    </Button>
  );
}
