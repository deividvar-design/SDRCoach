"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvite, type InviteAcceptState } from "./actions";

export function AcceptForm({ token, orgName, email }: { token: string; orgName: string; email: string }) {
  const [state, formAction, pending] = useActionState<InviteAcceptState, FormData>(acceptInvite.bind(null, token), {});
  const message =
    state.error === "mismatch" ? `This invite was sent to a different address. You are signed in as ${email}.`
    : state.error === "seats" ? "This workspace has no free seats. Ask your manager to add one, then try again."
    : state.error === "invalid" ? "This invite is no longer valid. Ask your manager to send a fresh one."
    : null;
  return (
    <form action={formAction} className="space-y-4">
      {message && <p className="text-destructive text-sm">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Joining…" : `Join ${orgName}`}</Button>
    </form>
  );
}
