import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { PageHeader } from "@/components/shell/page-header";
import { OrganizationForm, ProfileForm } from "./settings-forms";
import { DangerZone } from "./danger-zone";
import { Button } from "@/components/ui/button";
import { leaveWorkspace } from "./actions";
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
          <p className="text-muted-foreground mb-4 text-sm">You are on the <span className="text-foreground capitalize">{viewer.org.plan}</span> plan with {viewer.org.seat_limit} seats.</p>
          <Button variant="outline" asChild><Link href="/upgrade">Change plan</Link></Button>
        </section>
      )}
      {canManage(viewer.membership.role) && (
        <section className="bg-card rounded-xl border p-6">
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
