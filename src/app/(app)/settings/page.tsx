import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { PageHeader } from "@/components/shell/page-header";
import { OrganizationForm, ProfileForm } from "./settings-forms";
import { DangerZone } from "./danger-zone";
import { Button } from "@/components/ui/button";
import { leaveWorkspace } from "./actions";
import { openBillingPortal } from "../upgrade/actions";
import { formatDate } from "@/lib/utils";
import { PLANS } from "@/lib/billing/plans";
import Link from "next/link";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />
      <section className="bg-card rounded-xl border p-6">
        <h2 className="mb-4 font-medium">Profile</h2>
        <ProfileForm profile={viewer.profile} />
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
