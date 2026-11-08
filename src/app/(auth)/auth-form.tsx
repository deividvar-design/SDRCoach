"use client";

import Link from "next/link";
import { TRIAL } from "@/lib/billing/plans";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signInWithGoogle, signUp, type AuthState } from "./actions";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { GoogleMark } from "@/components/auth/google-mark";

export interface PlanIntent {
  plan: string;
  planName: string;
  billing: "month" | "quarter" | "year";
}

const BILLING_LABEL = { month: "billed monthly", quarter: "billed quarterly", year: "billed annually" } as const;

export function AuthForm({ mode, next, invite, email, notice, intent }: { mode: "login" | "signup"; next?: string; invite?: string; email?: string; notice?: { kind: "info" | "error"; text: string }; intent?: PlanIntent }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  // The plan picked on the pricing page rides along in a cookie, so it survives the Google round trip too.
  useEffect(() => {
    if (!intent) return;
    try {
      document.cookie = `plan_intent=${encodeURIComponent(`${intent.plan}:${intent.billing}`)};path=/;max-age=2592000;samesite=lax`;
    } catch {}
  }, [intent]);


  return (
    <div className="space-y-6">
      {!invite && <GoogleOneTap mode={mode} next={mode === "signup" ? "/onboarding" : next ?? "/dashboard"} />}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "login" ? "Sign in to keep training." : invite ? "You've been invited to join a team." : `Start your free trial: ${TRIAL.calls} calls, ${TRIAL.days} days, no card.`}
        </p>
      </div>

      {intent && mode === "signup" && (
        <p className="bg-card rounded-md border p-3 text-sm">
          Starting a trial of the <span className="font-medium">{intent.planName}</span> plan, {BILLING_LABEL[intent.billing]}. The trial is free; you pick the plan when it ends. <Link href="/pricing" className="text-muted-foreground underline underline-offset-4">Change</Link>
        </p>
      )}

      {notice && <p className={`rounded-md border p-3 text-sm ${notice.kind === "error" ? "border-destructive/40 text-destructive" : "text-muted-foreground"}`}>{notice.text}</p>}

      <form action={signInWithGoogle}>
        {next && <input type="hidden" name="next" value={next} />}
        {invite && <input type="hidden" name="invite" value={invite} />}
        <Button type="submit" size="lg" className="w-full gap-3">
          <GoogleMark />
          {mode === "login" ? "Sign in with Google" : "Continue with Google"}
        </Button>
        {mode === "signup" && !invite && (
          <p className="bg-muted/60 mt-4 rounded-xl px-4 py-3 text-center text-sm">
            Practising on your own? <Link href="/karen" className="font-medium underline underline-offset-4">Call Karen free</Link>, no account needed.
          </p>
        )}
      </form>
      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" />
        or with email
        <span className="bg-border h-px flex-1" />
      </div>

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {invite && <input type="hidden" name="invite" value={invite} />}
        {intent && <input type="hidden" name="plan_intent" value={`${intent.plan}:${intent.billing}`} />}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={email} placeholder={mode === "signup" && !invite ? "you@company.com" : undefined} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === "login" && <Link href="/forgot-password" className="text-muted-foreground text-xs hover:underline underline-offset-4">Forgot it?</Link>}
          </div>
          <Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
        </div>
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="full_name" name="full_name" autoComplete="name" maxLength={80} />
          </div>
        )}
        {state.error && <p className="text-destructive text-sm">{state.error}</p>}
        {state.message && <p className="text-success text-sm">{state.message}</p>}
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account with email"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "login" ? (
          <>
            New here? <Link href="/signup" className="text-foreground underline underline-offset-4">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login" className="text-foreground underline underline-offset-4">Sign in</Link>
          </>
        )}
      </p>
    </div>
  );
}

export { GoogleMark };
