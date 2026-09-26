"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForm({ mode, next, invite }: { mode: "login" | "signup"; next?: string; invite?: string }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "login" ? "Sign in to keep training." : invite ? "You've been invited to join a team." : "Start your team's free trial: 10 calls, 14 days, no card."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {invite && <input type="hidden" name="invite" value={invite} />}
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" autoComplete="name" required />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder={mode === "signup" && !invite ? "you@company.com" : undefined} />
          {mode === "signup" && !invite && <p className="text-muted-foreground text-xs">Work email only. Personal addresses can’t start a trial.</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
        </div>
        {state.error && <p className="text-destructive text-sm">{state.error}</p>}
        {state.message && <p className="text-success text-sm">{state.message}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
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
