"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approvePartner, declinePartner } from "./actions";

export function PartnerRowActions({ id, company }: { id: string; company: string }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: string } | { error: string }>) =>
    start(async () => {
      const r = await fn();
      if ("error" in r) toast.error(r.error);
      else toast.success(r.ok);
    });
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" variant="signal" disabled={pending} onClick={() => run(() => approvePartner(id))}>{pending ? "Working…" : "Approve"}</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => confirm(`Decline ${company} and email them a short note?`) && run(() => declinePartner(id, true))}>Decline</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm(`Decline ${company} without emailing them?`) && run(() => declinePartner(id, false))}>Decline quietly</Button>
    </div>
  );
}
