"use client";

import { useActionState } from "react";
import Link from "next/link";
import { challengeKaren, type ChallengeState } from "@/app/(marketing)/karen/actions";

/** The email fallback inside the hero's Karen card: one field, one button, on the dark panel. */
export function KarenQuickForm() {
  const [state, action, pending] = useActionState<ChallengeState, FormData>(challengeKaren, {});
  if (state.waitlisted) {
    return <p className="text-paper/80 text-sm">Karen has taken all the calls she will take today. Come back tomorrow, or <Link href="/signup" className="text-paper underline underline-offset-4">start a free trial</Link>, where she picks up every time.</p>;
  }
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2.5">
        <label htmlFor="hero-karen-email" className="sr-only">Email</label>
        <input
          id="hero-karen-email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          placeholder="you@company.com"
          className="text-paper placeholder:text-paper/45 focus-visible:ring-paper/40 h-12 min-w-0 flex-[1_1_13rem] rounded-xl border border-white/20 bg-white/[0.07] px-3.5 text-[15px] outline-none focus-visible:ring-[3px]"
        />
        <button type="submit" disabled={pending} className="text-paper focus-visible:ring-paper/40 h-12 grow cursor-pointer sm:grow-0 rounded-xl border border-paper/80 px-5 text-[15px] font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-[3px] disabled:opacity-60">
          {pending ? "Checking…" : "Call Karen"}
        </button>
      </div>
      {state.error && <p className="text-sm text-[#ffb59e]">{state.error}</p>}
    </form>
  );
}
