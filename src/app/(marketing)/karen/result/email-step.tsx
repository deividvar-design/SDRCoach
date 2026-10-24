"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDemoEmail, type EmailStepState } from "../actions";

/** After the call: where the scorecard goes. Unlocks the six-skill breakdown on this page and sends the report. */
export function EmailStep({ pending: reviewing }: { pending: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<EmailStepState, FormData>(addDemoEmail, {});

  useEffect(() => {
    if (state.done) router.refresh();
  }, [state.done, router]);

  if (state.done) return <p className="text-muted-foreground text-sm">Saved. Loading your scorecard…</p>;

  return (
    <form action={action} className="stage text-paper space-y-4 rounded-2xl p-6 md:p-7">
      <div>
        <div className="font-display text-3xl leading-tight">{reviewing ? "Where should the report go?" : "Where do we send your scorecard?"}</div>
        <p className="text-paper/75 mt-1.5 text-sm">The six-skill breakdown and the coach's notes unlock here and arrive by email. Any address works.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="result-email" className="text-paper/80">Email</Label>
          <Input id="result-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" spellCheck={false} required className="text-paper placeholder:text-paper/45 h-12 border-white/20 bg-white/[0.07]" />
        </div>
        <Button type="submit" size="lg" variant="signal" disabled={pending} className="h-12">
          {pending ? "Saving…" : "Show my scorecard"}
        </Button>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="result-newsletter" name="newsletter" className="mt-0.5 border-white/40" />
        <Label htmlFor="result-newsletter" className="text-paper/80 cursor-pointer text-sm leading-snug font-normal">Also send me the cold-calling newsletter, one email a fortnight.</Label>
      </div>
      {state.error && <p className="text-sm text-[#ffb59e]">{state.error}</p>}
      <p className="text-paper/60 text-xs leading-relaxed">
        We may follow up once about 100 Dials. Unsubscribe in one click. The call was recorded and scored. See the <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
      </p>
    </form>
  );
}
