import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { PlanGrid } from "@/components/billing/plan-grid";
import { openBillingPortal, startCheckout } from "./actions";
import { Button } from "@/components/ui/button";
import { stripeConfigured } from "@/lib/billing/stripe";

export const metadata = { title: "Upgrade" };

export default async function UpgradePage({ searchParams }: PageProps<"/upgrade">) {
  const { error, reason } = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [trial, { count }] = await Promise.all([
    loadTrialStatus(supabase, viewer.org),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
  ]);
  const memberCount = count ?? 1;
  const isManager = canManage(viewer.membership.role);
  const subscribed = Boolean(viewer.org.stripe_subscription_id) && viewer.org.plan !== "canceled";

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
      {typeof error === "string" && (
        <p className="text-destructive text-sm">
          {error === "billing_unavailable" ? "Checkout is not configured on this deployment yet." : error === "invalid" ? "Check the seat count and try again." : error === "price_missing" ? "The plan prices are not configured on this deployment yet." : "Something went wrong starting checkout. Try again."}
          {typeof reason === "string" && reason && <span className="text-muted-foreground block text-xs">Stripe said: {reason}</span>}
        </p>
      )}
      {subscribed ? (
        <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6">
          <div>
            <div className="font-medium">You already have an active subscription.</div>
            <div className="text-muted-foreground text-sm">Change seats or switch plans from the billing portal so you are never charged twice.</div>
          </div>
          <form action={openBillingPortal}><Button type="submit">Manage billing</Button></form>
        </div>
      ) : (
        <PlanGrid orgName={viewer.org.name} canBuy={isManager} checkoutAction={startCheckout} defaultSeats={Math.max(2, memberCount)} billingReady={stripeConfigured()} />
      )}
      <p className="text-muted-foreground text-sm">Secure card checkout by Stripe. Change seats, switch plans, update your card or cancel any time from Settings.</p>
    </div>
  );
}
