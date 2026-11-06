"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/components/analytics/provider";
import { PARTNER } from "@/content/founding-partners";
import { applyForPartnership, type ApplyState } from "./actions";

const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/** The application. Short on purpose: who, which team, when they can start, and agreement to the give-and-get. */
export function ApplyForm({ spotsLeft }: { spotsLeft: number }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyForPartnership, {});
  const [kickoff, setKickoff] = useState(state.values?.kickoff_wanted === "on");
  const v = state.values ?? {};
  const invalid = (name: string) => (state.field === name ? true : undefined);

  useEffect(() => {
    if (state.done) track("partner_applied", { spots_left: spotsLeft });
  }, [state.done, spotsLeft]);

  if (state.done) {
    return (
      <div className="bg-card rounded-2xl border p-6 md:p-8" role="status">
        <div className="font-display text-3xl">Application in.</div>
        <p className="text-muted-foreground mt-3">We reply within two working days. If it&apos;s a fit, the next email carries your workspace link, already set up from your website.</p>
      </div>
    );
  }

  return (
    // Submitted by hand rather than through the form's action prop, so a failed submit does not reset the form: what
    // was typed and both tick boxes stay as they were while the error is fixed.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="bg-card space-y-5 rounded-2xl border p-6 md:p-8"
      noValidate
    >
      {spotsLeft === 0 && <p className="text-muted-foreground text-sm">All {PARTNER.spots} spots are taken. Apply anyway and you go on the list for the next opening.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fp-name" label="Your name">
          <Input id="fp-name" name="name" autoComplete="name" defaultValue={v.name} aria-invalid={invalid("name")} required />
        </Field>
        <Field id="fp-role" label="Your role" hint="Optional">
          <Input id="fp-role" name="role" autoComplete="organization-title" placeholder="e.g. Head of SDR" defaultValue={v.role} />
        </Field>
        <Field id="fp-email" label="Work email">
          <Input id="fp-email" name="email" type="email" autoComplete="email" spellCheck={false} defaultValue={v.email} aria-invalid={invalid("email")} required />
        </Field>
        <Field id="fp-company" label="Company">
          <Input id="fp-company" name="company" autoComplete="organization" defaultValue={v.company} aria-invalid={invalid("company")} required />
        </Field>
        <Field id="fp-website" label="Company website" note="We build your workspace from it.">
          <Input id="fp-website" name="website" inputMode="url" placeholder="example.com" spellCheck={false} defaultValue={v.website} aria-invalid={invalid("website")} />
        </Field>
        <Field id="fp-sdrs" label="SDRs who cold call">
          <Input id="fp-sdrs" name="sdr_count" type="number" inputMode="numeric" min={1} max={500} defaultValue={v.sdr_count} aria-invalid={invalid("sdr_count")} required />
        </Field>
        <Field id="fp-start" label="Earliest start date">
          <Input id="fp-start" name="start_by" type="date" min={isoDay(0)} max={isoDay(60)} defaultValue={v.start_by ?? isoDay(7)} aria-invalid={invalid("start_by")} required />
        </Field>
      </div>

      <Field id="fp-notes" label="Anything we should know?" hint="Optional">
        <Textarea id="fp-notes" name="notes" rows={3} maxLength={600} placeholder="What you sell, the ramp you're fixing, a deadline" defaultValue={v.notes} />
      </Field>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Checkbox id="fp-kickoff" name="kickoff_wanted" checked={kickoff} onCheckedChange={(c) => setKickoff(c === true)} className="mt-0.5" />
          <Label htmlFor="fp-kickoff" className="cursor-pointer leading-snug font-normal">I&apos;d like a 15-minute kickoff call. The pilot runs fine without one.</Label>
        </div>
        {kickoff && (
          <Field id="fp-times" label="When suits you?" note="Days and times, with your time zone.">
            <Input id="fp-times" name="kickoff_times" placeholder="Tue or Wed after 3pm CET" defaultValue={v.kickoff_times} />
          </Field>
        )}
        <div className="flex items-start gap-2">
          <Checkbox id="fp-consent" name="consent" className="mt-0.5" aria-invalid={invalid("consent")} />
          <Label htmlFor="fp-consent" className="cursor-pointer leading-snug font-normal">
            I agree to the terms above: start within {PARTNER.startWithinDays} days, {PARTNER.callsPerRepPerWeek} calls per rep a week for {PARTNER.weeks} weeks, a short check-in at day 30, and permission to publish our name, logo, a quote and the day-30 numbers once I&apos;ve approved them.
          </Label>
        </div>
      </div>

      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="fp-extra">Leave this empty</label>
        <input id="fp-extra" name="fp_extra" tabIndex={-1} autoComplete="off" />
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
          {state.field === "sdr_count" && <> <Link href="/signup" className="underline underline-offset-4">Start the free trial</Link>.</>}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" variant="signal" disabled={pending}>{pending ? "Sending…" : "Apply for a spot"}</Button>
        <p className="text-muted-foreground text-sm">Two minutes. We reply within two working days.</p>
      </div>
    </form>
  );
}

/** A short hint sits beside the label; a longer note goes under the box, so labels never wrap. */
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
