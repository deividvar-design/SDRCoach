"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHECKIN_QUESTIONS } from "@/content/founding-partners";
import { submitCheckin, type CheckinState } from "./actions";

export function CheckinForm({ token, company, answers, approved }: { token: string; company: string; answers: Record<string, string>; approved: boolean }) {
  const [state, action, pending] = useActionState<CheckinState, FormData>(submitCheckin.bind(null, token), {});
  if (state.done) {
    return (
      <div className="bg-card rounded-2xl border p-6" role="status">
        <div className="font-display text-3xl">Thank you.</div>
        <p className="text-muted-foreground mt-2">{state.approved ? "Saved and approved. We'll send you the finished piece before it goes live." : "Saved. Nothing will be published until you approve it; this link stays open if you want to come back."}</p>
      </div>
    );
  }
  return (
    // Submitted by hand so a refused submit keeps the answers and the approval tick in place.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="bg-card space-y-5 rounded-2xl border p-6 md:p-8"
    >
      {CHECKIN_QUESTIONS.map((q, i) => (
        <div key={q.key} className="space-y-1.5">
          <Label htmlFor={`ci-${q.key}`}>{i + 1}. {q.label}</Label>
          <Textarea id={`ci-${q.key}`} name={q.key} rows={3} maxLength={1000} defaultValue={answers[q.key] ?? ""} />
        </div>
      ))}
      <div className="flex items-start gap-2">
        <Checkbox id="ci-approve" name="approve" defaultChecked={approved} className="mt-0.5" />
        <Label htmlFor="ci-approve" className="cursor-pointer leading-snug font-normal">
          100 Dials can publish {company}&apos;s name and logo, my answer to question 3 as a quote with my name and role, and the numbers on this page.
        </Label>
      </div>
      {state.error && <p className="text-destructive text-sm" role="alert">{state.error}</p>}
      <Button type="submit" size="lg" variant="signal" disabled={pending}>{pending ? "Saving…" : "Send"}</Button>
    </form>
  );
}
