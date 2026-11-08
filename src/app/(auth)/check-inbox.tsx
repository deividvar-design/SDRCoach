"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendConfirmation, signInWithGoogle, type ResendState } from "./actions";
import { GoogleMark } from "@/components/auth/google-mark";

/** Sends the confirmation email again, and says plainly whether it went. */
export function ResendConfirmation({ email, invite, variant = "outline", label = "Send the email again" }: { email: string; invite?: string; variant?: "outline" | "default"; label?: string }) {
  const [state, action, pending] = useActionState<ResendState, FormData>(resendConfirmation, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="email" value={email} />
      {invite && <input type="hidden" name="invite" value={invite} />}
      <Button type="submit" variant={variant} className="w-full" disabled={pending || state.sent}>
        {pending ? "Sending…" : state.sent ? "Sent. Check your inbox." : label}
      </Button>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
    </form>
  );
}

/**
 * Shown in place of the sign-up form once the account exists: the one thing left is the link in their inbox. Says
 * where it went, what to do if it isn't there, and offers Google as the way round.
 */
export function CheckInbox({ email, invite }: { email: string; invite?: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-signal/20 text-signal-ink grid size-12 place-items-center rounded-full">
        <MailCheck className="size-6" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to <span className="text-foreground font-medium break-all">{email}</span>. Click it and your workspace is ready. You can close this tab.
        </p>
      </div>

      <ul className="bg-card space-y-2 rounded-xl border px-4 py-3 text-sm">
        <li>It usually arrives within a minute, from 100 Dials, titled “Confirm your email for 100 Dials”.</li>
        <li>Not there? Look in spam, junk or promotions. Work inboxes sometimes hold new senders for a few minutes.</li>
      </ul>

      <ResendConfirmation email={email} invite={invite} />

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" />
        or skip the email
        <span className="bg-border h-px flex-1" />
      </div>
      <form action={signInWithGoogle}>
        {invite && <input type="hidden" name="invite" value={invite} />}
        <Button type="submit" size="lg" className="w-full gap-3">
          <GoogleMark />
          Continue with Google
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Wrong address? <Link href={invite ? `/signup?invite=${encodeURIComponent(invite)}` : "/signup"} className="text-foreground underline underline-offset-4">Start again</Link>
      </p>
    </div>
  );
}
