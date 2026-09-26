import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { PlanGrid } from "@/components/billing/plan-grid";

export const metadata = { title: "Upgrade" };

export default async function UpgradePage() {
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
      <PlanGrid orgName={viewer.org.name} canBuy={isManager} />
      <p className="text-muted-foreground text-sm">Card checkout is coming. Until then, every plan starts with a short conversation and an invoice, usually the same day.</p>
    </div>
  );
}
