"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** A destructive action asks once, in the kit's own dialog, never with window.confirm. */
export function ConfirmDialog({ trigger, title, description, confirmLabel = "Delete", onConfirm, pending = false }: { trigger: React.ReactNode; title: string; description: string; confirmLabel?: string; onConfirm: () => void; pending?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" disabled={pending} onClick={() => onConfirm()}>{pending ? "Working…" : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
