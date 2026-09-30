"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { draftFromWebsite, saveCompanyContext, type OnboardingState } from "../actions";
import type { WorkspaceDraft } from "@/lib/onboarding/draft";

export function ContextForm({ site }: { site?: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(saveCompanyContext, {});
  const [website, setWebsite] = useState(site ?? "");
  const [fields, setFields] = useState({ company_description: "", product_description: "", ideal_customer_profile: "" });
  const [target, setTarget] = useState<WorkspaceDraft["target"] | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [drafting, startDraft] = useTransition();
  const autoRan = useRef(false);

  function draft(url: string) {
    if (!url.trim()) return;
    setDraftError(null);
    startDraft(async () => {
      const result = await draftFromWebsite(url);
      if ("error" in result) {
        setDraftError(result.error);
        return;
      }
      const { target: t, ...rest } = result.draft;
      setFields(rest);
      setTarget(t);
    });
  }

  // Arriving from step 1 with a website: draft straight away, no extra click.
  useEffect(() => {
    if (site && !autoRan.current) {
      autoRan.current = true;
      draft(site);
    }
  }, [site]);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setFields((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form action={formAction} className="space-y-5">
      <div className="bg-card rounded-xl border p-4">
        <Label htmlFor="website">Draft it from your website</Label>
        <div className="mt-2 flex gap-2">
          <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="acme.com" inputMode="url" disabled={drafting} />
          <Button type="button" variant="outline" onClick={() => draft(website)} disabled={drafting || !website.trim()} className="shrink-0 gap-2">
            <Sparkles className="size-4" />
            {drafting ? "Reading…" : target ? "Redraft" : "Draft"}
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs" aria-live="polite">
          {drafting ? "Reading the homepage and writing your prospects. About twenty seconds." : draftError ? <span className="text-destructive">{draftError}</span> : "We read one page, write the three boxes below and design your first buyer. Edit anything before you finish."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company_description">What your company does</Label>
        <Textarea id="company_description" name="company_description" required value={fields.company_description} onChange={set("company_description")} placeholder="Brightline sells fleet telematics to mid-market logistics companies." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product_description">What reps are selling on the phone</Label>
        <Textarea id="product_description" name="product_description" required value={fields.product_description} onChange={set("product_description")} placeholder="A dashboard and driver app that cuts fuel and idle time. Typically $40–80 per vehicle per month. The ask on a cold call is a 15-minute demo." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ideal_customer_profile">Who you call</Label>
        <Textarea id="ideal_customer_profile" name="ideal_customer_profile" required value={fields.ideal_customer_profile} onChange={set("ideal_customer_profile")} placeholder="VP Ops or fleet managers at 100–1,000 vehicle fleets in freight, last-mile and field services. Trigger events: fleet growth, a new depot, insurance renewals." />
      </div>

      {target && (
        <div className="enter rounded-xl border border-dashed p-4">
          <div className="text-muted-foreground text-xs">Your first prospect</div>
          <div className="mt-1 font-medium">
            {target.name}, {target.title} at {target.company}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{target.persona_notes}</p>
          <p className="text-muted-foreground mt-2 text-xs">Will say: “{target.objections[0]}”. Edit them later under Targets.</p>
          <input type="hidden" name="starter_target" value={JSON.stringify(target)} />
        </div>
      )}

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || drafting}>
        {pending ? "Saving…" : target ? `Finish and call ${target.name.split(" ")[0]}` : "Finish setup"}
      </Button>
    </form>
  );
}
