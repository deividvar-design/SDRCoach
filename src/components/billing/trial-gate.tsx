"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TrialStatus } from "@/lib/billing/trial";

/** Pages that stay usable once a trial ends, so a manager can still buy or manage billing. */
const OPEN_PATHS = ["/upgrade", "/settings", "/admin", "/sessions"];

interface Props {
  status: TrialStatus;
  isManager: boolean;
  orgName: string;
  salesEmail: string;
  viewerEmail: string;
  offerLine?: string | null;
}

/** Greys out the app when the trial or subscription has ended. Only the plan and billing pages stay reachable. */
export function TrialGate({ status, isManager, orgName, salesEmail, viewerEmail, offerLine }: Props) {
  const pathname = usePathname();
  if (!status.exhausted || OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const ended = status.reason === "subscription";
  const title = ended ? "Your subscription has ended." : status.reason === "calls" ? "All trial calls used." : "Your trial has ended.";
  const subject = `${ended ? "Reactivate" : "Trial extension for"} ${orgName}`;
  const body = ended
    ? `Hi, our subscription for ${orgName} has ended and we'd like to pick it back up.\n\nSigned in as ${viewerEmail}.`
    : `Hi, our free trial for ${orgName} has ended (${status.callsUsed} calls made). Could we have a few more days to finish evaluating?\n\nSigned in as ${viewerEmail}.`;
  const mailto = `mailto:${salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Dialog open>
      <DialogContent
        className="paper-grain sm:max-w-lg [&>button:last-child]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <p className="text-signal text-xs font-medium tracking-[0.18em] uppercase">{ended ? "Subscription" : "Free trial"}</p>
          <DialogTitle className="font-display text-3xl font-normal">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {ended
              ? "Your calls, scores and targets are all still here. Pick a plan to get the team dialing again."
              : `${status.callsUsed} ${status.callsUsed === 1 ? "call" : "calls"} made. Everything is saved. ${isManager ? "Pick a plan to keep the team dialing, or ask us for a few more days." : "Ask your manager to pick a plan, or ask us for a few more days."}`}
          </DialogDescription>
        </DialogHeader>
        {isManager && offerLine && <p className="text-signal text-sm font-medium">{offerLine}</p>}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {isManager && (
            <Button asChild size="lg">
              <Link href="/upgrade">{ended ? "Pick a plan" : "Subscribe"}</Link>
            </Button>
          )}
          <Button asChild size="lg" variant={isManager ? "outline" : "default"}>
            <a href={mailto}>{ended ? "Talk to us" : "Request trial extension"}</a>
          </Button>
        </div>
        {isManager && (
          <p className="text-muted-foreground text-xs">
            {ended ? "Manage billing from " : "Plan and billing live in "}
            <Link href="/settings" className="underline underline-offset-4">Settings</Link>.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
