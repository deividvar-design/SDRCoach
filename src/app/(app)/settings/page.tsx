import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { PageHeader } from "@/components/shell/page-header";
import { OrganizationForm, PasswordForm, ProfileForm, TeamVisibilityForm } from "./settings-forms";
import { DangerZone } from "./danger-zone";
import { Button } from "@/components/ui/button";
import { leaveWorkspace } from "./actions";
import { openBillingPortal } from "../upgrade/actions";
import { formatDate } from "@/lib/utils";
import { PLANS } from "@/lib/billing/plans";
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
              <>Free trial with {viewer.org.seat_limit} seats.</>
            ) : (
              <>
                <span className="text-foreground">{PLANS.find((p) => p.id === viewer.org.plan)?.name ?? viewer.org.plan}</span> plan · {viewer.org.seat_limit} seats
                {viewer.org.billing_interval ? ` · billed ${viewer.org.billing_interval === "year" ? "yearly" : "monthly"}` : ""}
                {viewer.org.current_period_end ? ` · ${viewer.org.cancel_at_period_end ? "ends" : "renews"} ${formatDate(viewer.org.current_period_end)}` : ""}
                {viewer.org.subscription_status === "past_due" && <span className="text-destructive"> · payment failed, please update your card</span>}
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
