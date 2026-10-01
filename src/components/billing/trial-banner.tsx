import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TrialStatus } from "@/lib/billing/trial";

export function TrialBanner({ status, isManager, offerLine }: { status: TrialStatus; isManager: boolean; offerLine?: string | null }) {
  if (!status.onTrial && status.reason !== "subscription") return null;
  const urgent = status.exhausted || status.callsLeft <= 2 || status.daysLeft <= 2;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-sm md:px-8", urgent ? "bg-signal/10" : "bg-accent/40")}>
      <span className="text-xs">{status.reason === "subscription" ? "Subscription" : "Free trial"}</span>
      {status.exhausted ? (
        <span>{status.reason === "calls" ? "All trial calls used." : status.reason === "subscription" ? "Your subscription has ended." : "Your trial has ended."} {isManager ? (status.reason === "subscription" ? "Pick a plan to keep the team dialing." : "Upgrade to keep the team dialing.") : "Ask your manager."}</span>
      ) : (
        <span>
          <strong className="tabular">{status.callsLeft}</strong> of {status.callsUsed + status.callsLeft} calls left, <strong className="tabular">{status.daysLeft}</strong> day{status.daysLeft === 1 ? "" : "s"}
          {isManager && offerLine && <span className="text-muted-foreground"> · {offerLine}</span>}
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
