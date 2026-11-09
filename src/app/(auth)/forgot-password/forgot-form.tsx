"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type AuthState } from "../actions";
import { HONEYPOT_FIELD } from "@/lib/bot-check";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden from people; form-filling bots fill it in (see lib/bot-check.ts). */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state.message && <p className="text-success text-sm">{state.message}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}
