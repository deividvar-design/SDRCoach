import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TrialStatus } from "@/lib/billing/trial";

export function TrialBanner({ status, isManager }: { status: TrialStatus; isManager: boolean }) {
  if (!status.onTrial) return null;
  const urgent = status.exhausted || status.callsLeft <= 2 || status.daysLeft <= 2;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-sm md:px-8", urgent ? "bg-signal/10" : "bg-accent/40")}>
      <span className="font-mono text-[11px] tracking-[0.14em] uppercase">Free trial</span>
      {status.exhausted ? (
        <span>{status.reason === "calls" ? "All trial calls used." : "Your trial has ended."} {isManager ? "Upgrade to keep the team dialing." : "Ask your manager to upgrade."}</span>
      ) : (
        <span>
          <strong className="tabular">{status.callsLeft}</strong> of {status.callsUsed + status.callsLeft} calls left · <strong className="tabular">{status.daysLeft}</strong> day{status.daysLeft === 1 ? "" : "s"}
        </span>
      )}
      {isManager && (
        <Link href="/upgrade" className="ml-auto font-medium underline underline-offset-4">
          {status.exhausted ? "Upgrade now" : "See plans"}
        </Link>
      )}
    </div>
  );
}
