"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, SALES_EMAIL, TRIAL } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";

export function PlanGrid({
  orgName,
  canBuy = true,
  marketing = false,
  checkoutAction,
  defaultSeats = 3,
  billingReady = false,
}: {
  orgName?: string;
  canBuy?: boolean;
  marketing?: boolean;
  /** Server action that starts Stripe Checkout. When absent, CTAs fall back to links. */
  checkoutAction?: (formData: FormData) => void | Promise<void>;
  defaultSeats?: number;
  billingReady?: boolean;
}) {
  const [annual, setAnnual] = useState(true);
  const [seats, setSeats] = useState(defaultSeats);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3 text-sm">
        <button type="button" onClick={() => setAnnual(false)} className={cn("cursor-pointer", !annual ? "font-medium" : "text-muted-foreground")}>Monthly</button>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual((a) => !a)}
          className={cn("relative h-6 w-11 rounded-full transition-colors", annual ? "bg-foreground" : "bg-muted")}
        >
          <span className={cn("bg-background absolute top-0.5 size-5 rounded-full shadow transition-transform", annual ? "left-0.5 translate-x-5" : "left-0.5")} />
        </button>
        <button type="button" onClick={() => setAnnual(true)} className={cn("cursor-pointer", annual ? "font-medium" : "text-muted-foreground")}>
          Annual <span className="text-success ml-1 text-xs">save 20%</span>
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((p) => {
          const price = annual ? p.annualPerSeat : p.monthlyPerSeat;
          const subject = encodeURIComponent(`100 Dials ${p.name}${orgName ? ` for ${orgName}` : ""}`);
          const href = p.id === "enterprise" || !marketing ? `mailto:${SALES_EMAIL}?subject=${subject}` : "/signup";
          return (
            <div key={p.id} className={cn("bg-card relative flex flex-col rounded-2xl border p-6", p.highlight && "border-foreground shadow-lg")}>
              {p.highlight && <span className="bg-foreground text-background absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">Most teams</span>}
              <div className="font-display text-2xl">{p.name}</div>
              <p className="text-muted-foreground mt-1 text-sm">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                {price == null ? (
                  <span className="font-mono text-4xl font-medium">Custom</span>
                ) : (
                  <>
                    <span className="font-mono text-4xl font-medium tabular">${price}</span>
                    <span className="text-muted-foreground text-sm">/ seat / month</span>
                  </>
                )}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {p.callsPerSeat ? `${p.callsPerSeat} calls per seat per month, then $${p.overagePerCall?.toFixed(2)} a call` : "Volume pricing, custom call allowance"}
                {`, from ${p.minSeats} seats`}
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="text-success mt-0.5 size-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {checkoutAction && p.id !== "enterprise" && canBuy ? (
                <form action={checkoutAction} className="mt-6 space-y-3">
                  <input type="hidden" name="plan" value={p.id} />
                  <input type="hidden" name="interval" value={annual ? "year" : "month"} />
                  <label className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Seats</span>
                    <input
                      type="number"
                      name="seats"
                      min={p.minSeats}
                      max={500}
                      value={Math.max(seats, p.minSeats)}
                      onChange={(e) => setSeats(Number(e.target.value) || p.minSeats)}
                      className="border-input h-8 w-20 rounded-md border bg-transparent px-2 text-right font-mono text-sm tabular"
                    />
                  </label>
                  {price != null && (
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>{annual ? "Billed yearly" : "Billed monthly"}</span>
                      <span className="font-mono tabular">${(price * Math.max(seats, p.minSeats) * (annual ? 12 : 1)).toLocaleString()} / {annual ? "year" : "month"}</span>
                    </div>
                  )}
                  <Button type="submit" className="w-full" variant={p.highlight ? "default" : "outline"} disabled={!billingReady}>
                    {billingReady ? `Subscribe to ${p.name}` : "Checkout not configured yet"}
                  </Button>
                </form>
              ) : (
                <Button className="mt-6 w-full" variant={p.highlight ? "default" : "outline"} disabled={!canBuy} asChild={canBuy}>
                  {canBuy ? <Link href={href}>{marketing ? p.cta : p.id === "enterprise" ? "Talk to sales" : `Choose ${p.name}`}</Link> : <span>Ask your manager</span>}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {marketing && (
        <p className="text-muted-foreground text-center text-sm">
          Every plan starts with a free trial: {TRIAL.calls} calls, {TRIAL.days} days, no card. Work email required.
        </p>
      )}
    </div>
  );
}
