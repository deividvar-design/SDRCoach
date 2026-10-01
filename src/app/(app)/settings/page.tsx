import { requireViewer } from "@/lib/auth";
import { dateFormatter } from "@/lib/tz";
import { canManage } from "@/lib/domain/roles";
import { PageHeader } from "@/components/shell/page-header";
import { OrganizationForm, PasswordForm, ProfileForm, TeamVisibilityForm } from "./settings-forms";
import { DangerZone } from "./danger-zone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { leaveWorkspace } from "./actions";
import { openBillingPortal } from "../upgrade/actions";

import { INTERVALS, PLANS, SALES_EMAIL } from "@/lib/billing/plans";
import { loadAllowance } from "@/lib/billing/allowance";
import Link from "next/link";
import { StatusToast } from "@/components/status-toast";
import { SubscribedDialog } from "./subscribed-dialog";

export const metadata = { title: "Settings" };

const ERRORS: Record<string, string> = {
  already_subscribed: "This workspace already has an active subscription. Use Manage billing to change it.",
  stripe: "Billing could not be reached. Try again in a minute.",
  billing_unavailable: "Billing is not set up on this deployment yet.",
};

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { checkout, error } = await searchParams;
  const viewer = await requireViewer();
  const fmtDate = await dateFormatter();
  const allowance = await loadAllowance(viewer.org, { userId: viewer.userId, isManager: true });
  const problem = typeof error === "string" ? (ERRORS[error] ?? "Something went wrong.") : null;
  const paidPlan = PLANS.find((p) => p.id === viewer.org.plan && p.prices);
  const subscribed = paidPlan
    ? { name: paidPlan.name, seats: viewer.org.seat_limit, callsPerSeat: paidPlan.callsPerSeat, billed: viewer.org.billing_interval ? INTERVALS[viewer.org.billing_interval].billed : null }
    : null;
  return (
    <div className="space-y-8">
      {checkout === "success" && canManage(viewer.membership.role) && <SubscribedDialog plan={subscribed} />}
      <StatusToast message={problem} kind="error" />
      <PageHeader title="Settings" />
      <section className="bg-card rounded-xl border p-6">
        <h2 className="mb-4 font-medium">Profile</h2>
        <ProfileForm profile={viewer.profile} />
        <div className="mt-6 border-t pt-6">
          <h3 className="mb-3 text-sm font-medium">Password</h3>
          <PasswordForm />
        </div>
      </section>
      {canManage(viewer.membership.role) && (
        <section className="bg-card rounded-xl border p-6">
          <h2 className="mb-1 font-medium">Plan</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {viewer.org.plan === "trial" ? (
              <>Free trial with {viewer.org.seat_limit} {viewer.org.seat_limit === 1 ? "seat" : "seats"}.</>
            ) : (
              <>
                <span className="text-foreground">{PLANS.find((p) => p.id === viewer.org.plan)?.name ?? viewer.org.plan}</span> plan, {viewer.org.seat_limit} seats
                {viewer.org.billing_interval ? `, ${INTERVALS[viewer.org.billing_interval].billed.toLowerCase()}` : ""}
                {viewer.org.billing_currency ? ` in ${viewer.org.billing_currency.toUpperCase()}` : ""}
                {viewer.org.current_period_end ? `, ${viewer.org.cancel_at_period_end ? "ends" : "renews"} ${fmtDate(viewer.org.current_period_end)}` : ""}
                {viewer.org.subscription_status === "past_due" && <span className="text-destructive">, payment failed, please update your card</span>}.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {viewer.org.stripe_customer_id ? (
              <form action={openBillingPortal}><Button variant="outline" type="submit">Manage billing</Button></form>
            ) : null}
            <Button variant={viewer.org.plan === "trial" ? "default" : "ghost"} asChild><Link href="/upgrade">{viewer.org.plan === "trial" ? "Choose a plan" : "See plans"}</Link></Button>
          </div>
          {!(viewer.org.stripe_subscription_id && viewer.org.plan !== "canceled") && (
            <p className="text-muted-foreground mt-3 text-xs">
              Annual plans can be paid by invoice with 30-day terms. <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Invoice billing for ${viewer.org.name}`)}&body=${encodeURIComponent(`Plan: Starter / Team\nSeats: ${viewer.org.seat_limit}\nWorkspace id: ${viewer.org.id}\n`)}`} className="underline underline-offset-4">Request an invoice</a>.
            </p>
          )}
        </section>
      )}
      {canManage(viewer.membership.role) && allowance && (
        <section id="usage" className="bg-card rounded-xl border p-6">
          <h2 className="mb-1 font-medium">Usage</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            <span className="text-foreground tabular">{allowance.used}</span> of <span className="tabular">{allowance.included}</span>{" "}
            {allowance.kind === "trial" ? "trial calls used" : "included calls used this period"}
            {allowance.kind === "paid" && allowance.left === 0 ? ", dialing paused" : ""}
            {allowance.resetsAt ? `. ${allowance.kind === "trial" ? "Trial ends" : "Resets"} ${fmtDate(allowance.resetsAt)}.` : "."}
          </p>
          <Progress value={allowance.included > 0 ? Math.min(100, Math.round((allowance.used / allowance.included) * 100)) : 100} className="h-1.5 max-w-md" />
          {allowance.kind === "paid" && (
            <p className="text-muted-foreground mt-3 text-xs">Calls are pooled across seats and reset monthly. When they run out, dialing pauses until the reset. Adding a seat under Manage billing raises the allowance straight away.</p>
          )}
        </section>
      )}
      {canManage(viewer.membership.role) && (
        <section id="company" className="bg-card rounded-xl border p-6">
          <h2 className="mb-1 font-medium">Company context</h2>
          <p className="text-muted-foreground mb-4 text-sm">Injected into every prospect persona so objections and reactions fit what you actually sell.</p>
          <OrganizationForm org={viewer.org} />
        </section>
      )}
      {canManage(viewer.membership.role) && (
        <section id="team" className="bg-card rounded-xl border p-6">
          <h2 className="mb-1 font-medium">Team</h2>
          <p className="text-muted-foreground mb-4 text-sm">Who sees whose calls.</p>
          <TeamVisibilityForm org={viewer.org} />
        </section>
      )}
      {canManage(viewer.membership.role) ? (
        <section className="bg-card rounded-xl border p-6">
          <h2 className="mb-4 font-medium">Data</h2>
          <DangerZone slug={viewer.org.slug} isOwner={viewer.membership.role === "owner"} />
        </section>
      ) : (
        <section className="bg-card rounded-xl border p-6">
          <h2 className="mb-1 font-medium">Leave workspace</h2>
          <p className="text-muted-foreground mb-4 text-sm">Removes you from {viewer.org.name}. Your calls stay with the workspace.</p>
          <form action={leaveWorkspace}><Button type="submit" variant="outline">Leave {viewer.org.name}</Button></form>
        </section>
      )}
    </div>
  );
}

/** What the workspace has used in the current period, against what the plan includes. */
