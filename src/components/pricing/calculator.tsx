"use client";

import { useMemo, useState } from "react";
import { Eyebrow } from "@/components/marketing/sections";
import { formatMoney, type Currency } from "@/lib/billing/currency";
import { track } from "@/components/analytics/provider";
import { DEFAULT_CONSTANTS, DEFAULT_INPUTS, INPUT_RANGES, calculate, type CalculatorConstants, type CalculatorInputs } from "@/lib/pricing/calculator";

/** What is at stake on the buyer's team this month, against the price. Client-side, no email gate. */
export function PricingCalculator({ starterPrice, teamPrice, currency }: { starterPrice: number; teamPrice: number; currency: Currency }) {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [constants, setConstants] = useState<CalculatorConstants>(DEFAULT_CONSTANTS);
  const [touched, setTouched] = useState(false);
  const r = useMemo(() => calculate(inputs, constants, starterPrice), [inputs, constants, starterPrice]);
  const teamTotal = teamPrice * inputs.reps;
  const money = (n: number) => formatMoney(n, currency);

  const interacted = (field: string) => {
    if (touched) return;
    setTouched(true);
    track("calculator_interacted", { field });
  };
  const setInput = <K extends keyof CalculatorInputs>(k: K, v: number) => {
    interacted(k);
    setInputs((i) => ({ ...i, [k]: v }));
  };
  const setConstant = <K extends keyof CalculatorConstants>(k: K, v: number) => {
    interacted(k);
    setConstants((c) => ({ ...c, [k]: v }));
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-11 md:py-16" aria-labelledby="calc-heading">
      <Eyebrow>Your numbers</Eyebrow>
      <h2 id="calc-heading" className="font-display mt-3 text-4xl leading-[1.05] text-balance md:text-5xl">What is at stake on your team this month.</h2>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
        <div className="space-y-6">
          <Field label="Reps on the team" value={inputs.reps} display={String(inputs.reps)} range={INPUT_RANGES.reps} onChange={(v) => setInput("reps", v)} />
          <Field label="Dials per rep per day" value={inputs.dialsPerDay} display={String(inputs.dialsPerDay)} range={INPUT_RANGES.dialsPerDay} onChange={(v) => setInput("dialsPerDay", v)} />
          <Field label="Connect rate" value={inputs.connectRate} display={`${(inputs.connectRate * 100).toFixed(1).replace(/\.0$/, "")}%`} range={INPUT_RANGES.connectRate} scale={100} onChange={(v) => setInput("connectRate", v)} />
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer underline underline-offset-4">Adjust assumptions</summary>
            <div className="mt-4 space-y-4">
              <Constant label="Loaded cost per rep per month" note="Midpoint of US benchmarks; UK and EU buyers can lower it" value={constants.loadedCostPerRep} step={500} min={2000} max={20000} onChange={(v) => setConstant("loadedCostPerRep", v)} prefix="$" />
              <Constant label="Working days per month" value={constants.workingDays} step={1} min={15} max={23} onChange={(v) => setConstant("workingDays", v)} />
              <Constant label="Data and tooling cost per dial" note="Apollo or ZoomInfo seat plus dialler, spread over dials" value={constants.toolingPerDial} step={0.1} min={0} max={5} onChange={(v) => setConstant("toolingPerDial", v)} prefix="$" />
              <Constant label="Share of conversations a new rep mishandles" note="Our assumption, not a published figure; first-month reps miss more than this" value={Math.round(constants.mishandledShare * 100)} step={5} min={5} max={90} onChange={(v) => setConstant("mishandledShare", v / 100)} suffix="%" />
            </div>
          </details>
        </div>
        <div className="bg-card rounded-3xl border p-6 md:p-8">
          <dl className="grid gap-6 sm:grid-cols-2">
            <Out label="Conversations your team earns this month" value={r.conversations.toLocaleString("en-US")} note="live conversations" />
            <Out label="Cost per conversation" value={`~${money(r.costPerConversation)}`} note="each one, in salary, data and tools" />
            <Out label="Conversations at risk with an untrained rep" value={r.atRisk.toLocaleString("en-US")} note="go to reps still learning the opener" />
            <Out label="Pipeline effort at risk" value={money(r.burned)} note="this month, at the mishandled share above" />
          </dl>
          <div className="mt-8 border-t pt-6">
            <div className="text-muted-foreground text-xs">100 Dials for this team</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-5xl leading-none">{money(r.price)}</span>
              <span className="text-muted-foreground text-sm">a month on Starter · {money(teamTotal)} on Team</span>
            </div>
            <p className="mt-3 text-sm">
              {r.priceExceedsRisk ? "Less than what one mishandled week costs most teams." : `Less than the cost of ${r.ratio === 1 ? "one wasted conversation" : `${r.ratio} wasted conversations`}.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, display, range, scale = 1, onChange }: { label: string; value: number; display: string; range: { min: number; max: number; step: number }; scale?: number; onChange: (v: number) => void }) {
  const id = `calc-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <input
          type="number"
          aria-label={`${label}, number`}
          value={Number((value * scale).toFixed(2))}
          min={range.min * scale}
          max={range.max * scale}
          step={range.step * scale}
          onChange={(e) => {
            const v = Number(e.target.value) / scale;
            if (Number.isFinite(v)) onChange(Math.min(range.max, Math.max(range.min, v)));
          }}
          className="border-input h-8 w-24 rounded-md border bg-transparent px-2 text-right font-mono text-sm tabular"
        />
      </div>
      <input id={id} type="range" value={value} min={range.min} max={range.max} step={range.step} onChange={(e) => onChange(Number(e.target.value))} className="accent-signal mt-2 w-full" />
      <div className="text-muted-foreground mt-1 text-xs">{display}</div>
    </div>
  );
}

function Constant({ label, note, value, step, min, max, onChange, prefix = "", suffix = "" }: { label: string; note?: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  const id = `calc-const-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm">{label}</label>
        {note && <div className="text-muted-foreground text-xs">{note}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1 font-mono text-sm">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <input id={id} type="number" value={value} step={step} min={min} max={max} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v))); }} className="border-input h-8 w-24 rounded-md border bg-transparent px-2 text-right tabular" />
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Out({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-display mt-1 text-4xl leading-none tabular">{value}</dd>
      <dd className="text-muted-foreground mt-1 text-xs">{note}</dd>
    </div>
  );
}
