"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TrialStatus } from "@/lib/billing/trial";

/** Pages that stay usable once a subscription ends, so a manager can still buy or manage billing. */
const OPEN_PATHS = ["/upgrade", "/settings", "/admin", "/sessions"];

interface Props {
  status: TrialStatus;
  isManager: boolean;
  orgName: string;
  salesEmail: string;
  viewerEmail: string;
  offerLine?: string | null;
}

/**
 * Greys out the app when a subscription has ended; only the plan and billing pages stay reachable. A trial that has
 * run out is not gated: the practice and report pages show the ways forward instead, and nothing else is blocked.
 */
export function TrialGate({ status, isManager, orgName, salesEmail, viewerEmail, offerLine }: Props) {
  const pathname = usePathname();
  if (status.reason !== "subscription" || OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const mailto = `mailto:${salesEmail}?subject=${encodeURIComponent(`Reactivate ${orgName}`)}&body=${encodeURIComponent(`Hi, our subscription for ${orgName} has ended and we'd like to pick it back up.\n\nSigned in as ${viewerEmail}.`)}`;

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-lg [&>button:last-child]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <p className="text-signal-ink text-sm font-medium">Subscription</p>
          <DialogTitle className="font-display text-3xl font-normal">Your subscription has ended.</DialogTitle>
          <DialogDescription className="text-base">Your calls, scores and targets are all still here. Pick a plan to get the team dialing again.</DialogDescription>
        </DialogHeader>
        {isManager && offerLine && <p className="text-signal-ink text-sm font-medium">{offerLine}</p>}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {isManager && (
            <Button asChild size="lg">
              <Link href="/upgrade">Pick a plan</Link>
            </Button>
          )}
          <Button asChild size="lg" variant={isManager ? "outline" : "default"}>
            <a href={mailto}>Talk to us</a>
          </Button>
        </div>
        {isManager && (
          <p className="text-muted-foreground text-xs">
            Manage billing from <Link href="/settings" className="underline underline-offset-4">Settings</Link>.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
