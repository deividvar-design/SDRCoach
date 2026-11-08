"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** The submit inside the call form: shows that the line is being opened while the server creates the call. */
export function CallKarenSubmit({ className, children = "Call Karen now", pendingLabel = "Opening the line…" }: { className?: string; children?: React.ReactNode; pendingLabel?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "bg-signal text-signal-foreground focus-visible:ring-ring/50 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl text-[17px] font-medium outline-none transition-[filter] hover:brightness-105 focus-visible:ring-[3px] disabled:cursor-progress disabled:opacity-70",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
