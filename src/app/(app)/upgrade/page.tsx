import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { PlanGrid } from "@/components/billing/plan-grid";
import { openBillingPortal, startCheckout } from "./actions";
import { Button } from "@/components/ui/button";
import { stripeConfigured } from "@/lib/billing/stripe";
import { viewerCurrency } from "@/lib/billing/currency-server";
import { SALES_EMAIL } from "@/lib/billing/plans";
import { track } from "@vercel/analytics/server";
import { currentOffer } from "@/lib/billing/offers";
import { dateFormatter } from "@/lib/tz";

export const metadata = { title: "Upgrade" };

/** A prefilled email so the request arrives with everything needed to raise the invoice and link it to the workspace. */
function invoiceMailto(orgName: string, orgId: string, seats: number) {
  const subject = `Invoice billing for ${orgName}`;
  const body = `Hi,\n\nWe'd like to pay ${orgName}'s annual plan by invoice.\n\nPlan: Starter / Team\nSeats: ${seats}\nBilling address and VAT number:\n\nWorkspace id: ${orgId}\n`;
  return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function UpgradePage({ searchParams }: PageProps<"/upgrade">) {
  const { error, reason } = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [trial, { count }] = await Promise.all([
    loadTrialStatus(viewer.org),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
  ]);
  const memberCount = count ?? 1;
  const currency = await viewerCurrency();
  const isManager = canManage(viewer.membership.role);
  const subscribed = Boolean(viewer.org.stripe_subscription_id) && viewer.org.plan !== "canceled";
  const [offer, fmtDate] = await Promise.all([subscribed ? null : currentOffer(viewer.org), dateFormatter()]);
  await track("upgrade_view", { plan: viewer.org.plan, manager: isManager, calls_left: trial.onTrial ? trial.callsLeft : -1 }).catch(() => {});

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
      {offer && (
        <div className="border-signal/40 bg-signal/5 rounded-2xl border p-5">
          <div className="font-medium">{offer.percent}% off your first three months.</div>
          <p className="text-muted-foreground text-sm">{offer.id === "trial15" ? `For upgrading before the trial ends on ${fmtDate(offer.until)}.` : `Open until ${fmtDate(offer.until)}.`} Applied automatically at checkout, on any plan and any billing period.</p>
        </div>
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
        <PlanGrid orgName={viewer.org.name} canBuy={isManager} checkoutAction={startCheckout} defaultSeats={Math.max(1, memberCount)} billingReady={stripeConfigured()} intervals={["month", "quarter", "year"]} currency={currency} />
      )}
      {!subscribed && isManager && (
        <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6">
          <div>
            <div className="font-medium">Prefer to pay by invoice?</div>
            <div className="text-muted-foreground text-sm">Annual plans can be invoiced with 30-day payment terms. Tell us the plan and seat count and the invoice is in your inbox the same day.</div>
          </div>
          <Button variant="outline" asChild>
            <a href={invoiceMailto(viewer.org.name, viewer.org.id, memberCount)}>Request an invoice</a>
          </Button>
        </div>
      )}
      <p className="text-muted-foreground text-sm">
        Secure card checkout by Stripe. Change seats, switch plans, update your card or cancel any time from Settings. Not working for the team? Email us within 30 days of your first payment and we refund it in full.
      </p>
    </div>
  );
}
