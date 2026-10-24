"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestWorkEmailLink, signIn, signInWithGoogle, signUp, type AuthState } from "./actions";
import { GoogleOneTap } from "@/components/auth/google-one-tap";

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

  if (state.personalEmail) return <PersonalEmailNext email={state.personalEmail} />;

  return (
    <div className="space-y-6">
      {!invite && <GoogleOneTap mode={mode} next={mode === "signup" ? "/onboarding" : next ?? "/dashboard"} />}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "login" ? "Sign in to keep training." : invite ? "You've been invited to join a team." : "Start your team's free trial: 10 calls, 14 days, no card."}
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
        {mode === "signup" && !invite && <p className="text-muted-foreground mt-2 text-center text-xs">Use your Google Workspace account. Personal Gmail can't start a trial.</p>}
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
          <Label htmlFor="email">Work email</Label>
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

/** A personal address cannot start a trial, but it can call Karen now, or have the link sent to a work inbox. */
function PersonalEmailNext({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestWorkEmailLink, {});
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">That one's a personal address.</h1>
        <p className="text-muted-foreground text-sm">The trial creates a workspace for your company, so it has to start from a work email. Two ways on from here.</p>
      </div>
      <div className="bg-card space-y-2 rounded-2xl border p-5">
        <div className="font-medium">Try Karen now</div>
        <p className="text-muted-foreground text-sm">One free three-minute cold call against our rudest AI prospect, scored, with any email. No account.</p>
        <Button variant="signal" className="w-full" asChild><Link href={`/karen?email=${encodeURIComponent(email)}`}>Call Karen</Link></Button>
      </div>
      <form action={action} className="bg-card space-y-3 rounded-2xl border p-5">
        <div className="font-medium">Email me a link to continue from my work inbox</div>
        <div className="space-y-2">
          <Label htmlFor="work_email">Work email</Label>
          <Input id="work_email" name="work_email" type="email" autoComplete="email" placeholder="you@company.com" required />
        </div>
        {state.error && <p className="text-destructive text-sm">{state.error}</p>}
        {state.message ? <p className="text-success text-sm">{state.message}</p> : (
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send the link"}</Button>
        )}
      </form>
      <p className="text-muted-foreground text-center text-sm"><Link href="/signup" className="underline underline-offset-4">Use a different email</Link></p>
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l4.1-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
