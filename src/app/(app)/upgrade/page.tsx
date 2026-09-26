import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { PlanGrid } from "@/components/billing/plan-grid";
import { startCheckout } from "./actions";
import { stripeConfigured } from "@/lib/billing/stripe";

export const metadata = { title: "Upgrade" };

export default async function UpgradePage({ searchParams }: PageProps<"/upgrade">) {
  const { error } = await searchParams;
  const viewer = await requireViewer();
  const trial = await loadTrialStatus(await createClient(), viewer.org);
  const isManager = canManage(viewer.membership.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={trial.onTrial ? "Free trial" : viewer.org.plan}
        title={trial.exhausted ? "Keep the team dialing." : "Pick a plan."}
        description={
          trial.onTrial
            ? trial.exhausted
              ? "Your trial is over. Every plan includes everything you've used so far, plus recordings and grounding on your own calls."
              : `${trial.callsLeft} trial calls and ${trial.daysLeft} days left. Upgrade any time and keep your history.`
            : "You're on a paid plan. Contact us to change seats or plans."
        }
      />
      {typeof error === "string" && <p className="text-destructive text-sm">{error === "billing_unavailable" ? "Checkout is not configured on this deployment yet." : "Something went wrong starting checkout. Try again."}</p>}
      <PlanGrid orgName={viewer.org.name} canBuy={isManager} checkoutAction={startCheckout} defaultSeats={Math.max(3, viewer.org.seat_limit)} billingReady={stripeConfigured()} />
      <p className="text-muted-foreground text-sm">Secure card checkout by Stripe. Change seats, switch plans, update your card or cancel any time from Settings.</p>
    </div>
  );
}
