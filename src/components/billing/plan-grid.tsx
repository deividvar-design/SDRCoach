"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTERVALS, PLANS, SALES_EMAIL, TRIAL, pricePerSeat, type BillingInterval } from "@/lib/billing/plans";
import { CURRENCIES, formatMoney, type Currency } from "@/lib/billing/currency";
import { Button } from "@/components/ui/button";

/** Remembered for a year so the pricing page, the upgrade page and checkout agree. */
function rememberCurrency(c: Currency) {
  try {
    document.cookie = `currency=${c};path=/;max-age=31536000;samesite=lax`;
  } catch {}
}

export function PlanGrid({
  orgName,
  canBuy = true,
  marketing = false,
  checkoutAction,
  defaultSeats = 3,
  billingReady = false,
  intervals = ["month", "year"],
  currency: initialCurrency = "usd",
  founding = null,
}: {
  orgName?: string;
  canBuy?: boolean;
  marketing?: boolean;
  /** Server action that starts Stripe Checkout. When absent, CTAs fall back to links. */
  checkoutAction?: (formData: FormData) => void | Promise<void>;
  defaultSeats?: number;
  billingReady?: boolean;
  /** Billing intervals to offer. The public page shows monthly and annual; the app adds quarterly. */
  intervals?: BillingInterval[];
  /** Currency to show first, decided server-side from the visitor's country or their earlier choice. */
  currency?: Currency;
  /** Founding pricing for Starter while spots remain; null hides it. Decided server-side from real subscription counts. */
  founding?: { left: number; total: number; price: Record<Currency, number> } | null;
}) {
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);
  const [seats, setSeats] = useState(defaultSeats);
  const meta = INTERVALS[interval];
  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    rememberCurrency(c);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="bg-muted inline-flex rounded-full p-1 text-sm" role="radiogroup" aria-label="Billing interval">
          {intervals.map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={interval === i}
              onClick={() => setInterval(i)}
              className={cn("cursor-pointer rounded-full px-4 py-1.5 transition-colors", interval === i ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {INTERVALS[i].label}
              {INTERVALS[i].saving && <span className={cn("ml-1.5 text-xs", interval === i ? "text-signal-ink" : "")}>{INTERVALS[i].saving}</span>}
            </button>
          ))}
        </div>
        <div className="bg-muted inline-flex rounded-full p-1 text-sm" role="radiogroup" aria-label="Currency">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={currency === c}
              onClick={() => setCurrency(c)}
              className={cn("cursor-pointer rounded-full px-3 py-1.5 font-mono transition-colors", currency === c ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((p) => {
          const listPrice = pricePerSeat(p, interval, currency);
          const isFounding = Boolean(founding && p.id === "starter");
          const price = isFounding && founding ? founding.price[currency] : listPrice;
          const subject = encodeURIComponent(`100 Dials ${p.name}${orgName ? ` for ${orgName}` : ""}`);
          const href = p.id === "enterprise" || !marketing ? `mailto:${SALES_EMAIL}?subject=${subject}` : `/signup?plan=${p.id}&billing=${interval}`;
          return (
            <div key={p.id} className={cn("bg-card relative flex flex-col rounded-2xl border p-6", p.highlight && "border-foreground shadow-lg", isFounding && "border-signal/60")}>
              {p.highlight && <span className="bg-foreground text-background absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">Recommended</span>}
              {isFounding && <span className="bg-signal text-signal-foreground absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">Founding pricing</span>}
              <div className="font-display text-2xl">{p.name}</div>
              <p className="text-muted-foreground mt-1 text-sm">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                {price == null ? (
                  <span className="font-mono text-4xl font-medium">Custom</span>
                ) : (
                  <>
                    <span className="font-mono text-4xl font-medium tabular">{formatMoney(price, currency)}</span>
                    <span className="text-muted-foreground text-sm">/ seat / month</span>
                    {isFounding && listPrice != null && listPrice > (price ?? 0) && <span className="text-muted-foreground ml-1 font-mono text-sm line-through tabular" title={`${meta.label} list price`}>{formatMoney(listPrice, currency)}</span>}
                  </>
                )}
              </div>
              {price != null && interval !== "month" && (
                <div className="text-muted-foreground mt-1 text-xs">
                  {interval === "year" ? "Billed annually" : "Billed quarterly"}: {formatMoney(price * meta.months, currency)} per seat per {interval === "year" ? "year" : "quarter"}
                </div>
              )}
              <div className="text-muted-foreground mt-1 text-xs">
                {p.callsPerSeat ? `${p.callsPerSeat} calls per seat per month, pooled across the team` : "Volume pricing, custom call allowance"}
                {p.minSeats > 1 ? `, from ${p.minSeats} seats` : ", from a single seat"}
              </div>
              {isFounding && <p className="text-signal-ink mt-2 text-[13px] font-medium">{formatMoney(price ?? 0, currency)} a seat, locked for as long as you stay subscribed. Launch pricing, for a limited number of teams.</p>}
              <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
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
                  <input type="hidden" name="interval" value={interval} />
                  <input type="hidden" name="currency" value={currency} />
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
                      <span>{meta.billed}</span>
                      <span className="font-mono tabular">{formatMoney(price * Math.max(seats, p.minSeats) * meta.months, currency)} / {interval === "year" ? "year" : interval === "quarter" ? "quarter" : "month"}</span>
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
          Every plan starts with a free trial: {TRIAL.calls} calls, {TRIAL.days} days, no card. Work email required. Annual plans can be paid by invoice: email {SALES_EMAIL}. Prices exclude VAT.
        </p>
      )}
    </div>
  );
}
