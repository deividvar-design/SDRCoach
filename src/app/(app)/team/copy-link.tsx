"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyLink({ link, label = "Copy link" }: { link: string; label?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(link);
        toast.success("Invite link copied");
      }}
    >
      <Copy /> {label}
    </Button>
  );
}
