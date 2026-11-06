"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyLink } from "@/app/(app)/team/copy-link";
import { track } from "@/components/analytics/provider";
import { AFFILIATE } from "@/content/affiliates";
import { joinAffiliates, type JoinState } from "./actions";

/** Name, email, where the link will go, and how to get paid. The link shows on the page and arrives by email. */
export function JoinForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinAffiliates, {});
  const [method, setMethod] = useState<"paypal" | "bank">((state.values?.payout_method as "paypal" | "bank") ?? "paypal");
  const v = state.values ?? {};
  const invalid = (name: string) => (state.field === name ? true : undefined);

  useEffect(() => {
    if (state.link) track("affiliate_joined");
  }, [state.link]);

  if (state.link) {
    return (
      <div className="bg-card rounded-2xl border p-6 md:p-8" role="status">
        <div className="font-display text-3xl">Your link.</div>
        <p className="mt-3 font-mono text-sm break-all">{state.link}</p>
        <div className="mt-4"><CopyLink link={state.link} label="Copy link" /></div>
        <p className="text-muted-foreground mt-4 text-sm">It is in your inbox too. Anyone who opens it and starts a workspace within {AFFILIATE.cookieDays} days is yours.</p>
      </div>
    );
  }

  return (
    // Submitted by hand so a refused submit keeps what was typed and the tick boxes as they were.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="bg-card space-y-5 rounded-2xl border p-6 md:p-8"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="af-name" label="Your name">
          <Input id="af-name" name="name" autoComplete="name" defaultValue={v.name} aria-invalid={invalid("name")} required />
        </Field>
        <Field id="af-email" label="Email">
          <Input id="af-email" name="email" type="email" autoComplete="email" spellCheck={false} defaultValue={v.email} aria-invalid={invalid("email")} required />
        </Field>
      </div>
      <Field id="af-channel" label="Where will you share it?" hint="Optional">
        <Input id="af-channel" name="channel" placeholder="A newsletter, a community, your LinkedIn, a course" defaultValue={v.channel} />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">How should we pay you?</legend>
        <div className="flex gap-4 text-sm">
          {(["paypal", "bank"] as const).map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="payout_method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-signal" />
              {m === "paypal" ? "PayPal" : "Bank transfer"}
            </label>
          ))}
        </div>
        <Field id="af-details" label={method === "paypal" ? "PayPal email" : "IBAN and account name"} note={method === "bank" ? "SEPA transfers from Lithuania. Outside the euro area, PayPal is quicker." : undefined}>
          <Input id="af-details" name="payout_details" defaultValue={v.payout_details} aria-invalid={invalid("payout_details")} required />
        </Field>
      </fieldset>

      <div className="flex items-start gap-2">
        <Checkbox id="af-terms" name="terms" className="mt-0.5" aria-invalid={invalid("terms")} />
        <Label htmlFor="af-terms" className="cursor-pointer leading-snug font-normal">I accept the programme terms above, including the rules on where the link may be used.</Label>
      </div>

      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="af-extra">Leave this empty</label>
        <input id="af-extra" name="af_extra" tabIndex={-1} autoComplete="off" />
      </div>

      {state.error && <p className="text-destructive text-sm" role="alert">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" variant="signal" disabled={pending}>{pending ? "Creating…" : "Get my link"}</Button>
        <p className="text-muted-foreground text-sm">Your link is ready the moment you press the button.</p>
      </div>
    </form>
  );
}

function Field({ id, label, hint, note, children }: { id: string; label: string; hint?: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {hint && <span className="text-muted-foreground ml-1.5 font-normal">{hint}</span>}
      </Label>
      {children}
      {note && <p className="text-muted-foreground text-xs">{note}</p>}
    </div>
  );
}
