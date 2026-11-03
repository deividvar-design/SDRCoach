"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimAccess, type ClaimState } from "./actions";

export function ClaimForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimAccess.bind(null, token), {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} readOnly className="bg-muted/50" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Your name</Label>
        <Input id="full_name" name="full_name" autoComplete="name" placeholder="So the coach can address you" maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Choose a password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" autoFocus />
      </div>
      {state.error && (
        <p className="text-destructive text-sm">
          {state.error}
          {state.exists && <> <Link href={`/login?email=${encodeURIComponent(email)}`} className="underline underline-offset-4">Sign in</Link>.</>}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Setting up your workspace…" : "Create my password and start"}</Button>
      <p className="text-muted-foreground text-center text-xs">
        By continuing you agree to the <Link href="/terms" className="underline underline-offset-4">terms</Link> and <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
      </p>
    </form>
  );
}
