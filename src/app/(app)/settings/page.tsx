import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { PageHeader } from "@/components/shell/page-header";
import { OrganizationForm, ProfileForm } from "./settings-forms";

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
          <h2 className="mb-1 font-medium">Company context</h2>
          <p className="text-muted-foreground mb-4 text-sm">Injected into every prospect persona so objections and reactions fit what you actually sell.</p>
          <OrganizationForm org={viewer.org} />
        </section>
      )}
    </div>
  );
}
