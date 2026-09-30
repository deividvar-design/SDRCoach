import { requireViewer } from "@/lib/auth";
import { dateFormatter } from "@/lib/tz";
import { canManage } from "@/lib/domain/roles";
import { PageHeader } from "@/components/shell/page-header";
import { OrganizationForm, PasswordForm, ProfileForm, TeamVisibilityForm } from "./settings-forms";
import { DangerZone } from "./danger-zone";
import { Button } from "@/components/ui/button";
import { leaveWorkspace } from "./actions";
import { openBillingPortal } from "../upgrade/actions";

import { INTERVALS, PLANS } from "@/lib/billing/plans";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StatusToast } from "@/components/status-toast";

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
  const usage = await periodUsage(viewer.org);
  const notice = checkout === "success" ? "You're on a paid plan. Thanks for backing the team." : null;
  const problem = typeof error === "string" ? (ERRORS[error] ?? "Something went wrong.") : null;
  return (
    <div className="space-y-8">
      <StatusToast message={notice} />
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
              <>Free trial with {viewer.org.seat_limit} {viewer.org.seat_limit === 1 ? "seat" : "seats"}. {usage.label}</>
            ) : (
              <>
                <span className="text-foreground">{PLANS.find((p) => p.id === viewer.org.plan)?.name ?? viewer.org.plan}</span> plan, {viewer.org.seat_limit} seats
                {viewer.org.billing_interval ? `, ${INTERVALS[viewer.org.billing_interval].billed.toLowerCase()}` : ""}
                {viewer.org.current_period_end ? `, ${viewer.org.cancel_at_period_end ? "ends" : "renews"} ${fmtDate(viewer.org.current_period_end)}` : ""}
                {viewer.org.subscription_status === "past_due" && <span className="text-destructive">, payment failed, please update your card</span>}
                . {usage.label}
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {viewer.org.stripe_customer_id ? (
              <form action={openBillingPortal}><Button variant="outline" type="submit">Manage billing</Button></form>
            ) : null}
            <Button variant={viewer.org.plan === "trial" ? "default" : "ghost"} asChild><Link href="/upgrade">{viewer.org.plan === "trial" ? "Choose a plan" : "See plans"}</Link></Button>
          </div>
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
async function periodUsage(org: Awaited<ReturnType<typeof requireViewer>>["org"]): Promise<{ label: string }> {
  if (org.plan === "trial" || org.plan === "canceled") {
    const t = await loadTrialStatus(org);
    return { label: `${t.callsUsed} of ${org.trial_call_limit} trial calls used.` };
  }
  const plan = PLANS.find((p) => p.id === org.plan);
  const end = org.current_period_end ? new Date(org.current_period_end) : null;
  if (!plan?.callsPerSeat || !end) return { label: "" };
  const months = org.billing_interval ? INTERVALS[org.billing_interval].months : 1;
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - months);
  const supabase = await createClient();
  const { count } = await supabase.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", org.id).not("started_at", "is", null).neq("status", "failed").gte("started_at", start.toISOString());
  const included = plan.callsPerSeat * org.seat_limit * months;
  return { label: `${count ?? 0} of ${included} included calls used this period.` };
}
