"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordPayout, setAffiliateStatus } from "./actions";

type Result = { ok: string } | { error: string };

export function AffiliateRowActions({ id, status, period, suggested }: { id: string; status: "active" | "paused" | "closed"; period: string; suggested: { currency: "usd" | "eur"; amount: number } | null }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if ("error" in r) toast.error(r.error);
      else {
        toast.success(r.ok);
        setOpen(false);
      }
    });
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant={suggested ? "signal" : "outline"} disabled={pending} onClick={() => setOpen((o) => !o)}>Record payout</Button>
        {status === "active" ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setAffiliateStatus(id, "paused"))}>Pause</Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setAffiliateStatus(id, "active"))}>Reactivate</Button>
        )}
        {status !== "closed" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Close this affiliate? Unpaid balance is forfeited.") && run(() => setAffiliateStatus(id, "closed"))}>Close</Button>}
      </div>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => recordPayout(id, new FormData(e.currentTarget)));
          }}
          className="flex flex-wrap items-end justify-end gap-2 text-sm"
        >
          <select name="currency" defaultValue={suggested?.currency ?? "usd"} className="border-input h-8 rounded-md border bg-transparent px-2">
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
          </select>
          <Input name="amount" type="number" step="0.01" min="0.01" defaultValue={suggested ? (suggested.amount / 100).toFixed(2) : ""} placeholder="Amount" className="h-8 w-28" required />
          <Input name="period" defaultValue={period} className="h-8 w-24" required />
          <Input name="note" placeholder="Reference" className="h-8 w-32" />
          <Button size="sm" type="submit" disabled={pending}>Save</Button>
        </form>
      )}
    </div>
  );
}
