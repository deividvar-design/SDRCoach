import Link from "next/link";
import { isAdminEmail, requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { FeedbackLink } from "@/components/shell/feedback-dialog";
import { TrialBanner } from "@/components/billing/trial-banner";
import { ReviewWatcher } from "@/components/calls/review-watcher";
import { loadTrialStatus } from "@/lib/billing/usage";
import { createClient } from "@/lib/supabase/server";

export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  const isManager = canManage(viewer.membership.role);
  const supabase = await createClient();
  const [trial, { data: pendingRows }] = await Promise.all([
    loadTrialStatus(viewer.org),
    supabase.from("call_sessions").select("id").eq("user_id", viewer.userId).not("review_requested_at", "is", null).in("status", ["ended", "scoring"]).limit(10),
  ]);
  const isAdmin = isAdminEmail(viewer.email);

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r p-3 md:flex">
        <Link href="/dashboard" className="px-2 py-3">
          <Logo descriptor />
        </Link>
        <div className="text-muted-foreground mb-4 truncate px-3 text-xs">{viewer.org.name}</div>
        <SidebarNav isManager={isManager} />
        <div className="mt-auto flex flex-col gap-1">
          <FeedbackLink />
          <UserMenu
            name={viewer.profile.full_name ?? viewer.email}
            email={viewer.email}
            avatarUrl={viewer.profile.avatar_url}
            role={ROLE_LABEL[viewer.membership.role]}
            isAdmin={isAdmin}
          />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/90 sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <UserMenu compact name={viewer.profile.full_name ?? viewer.email} email={viewer.email} avatarUrl={viewer.profile.avatar_url} role={ROLE_LABEL[viewer.membership.role]} isAdmin={isAdmin} />
        </header>
        <TrialBanner status={trial} isManager={isManager} />
        <ReviewWatcher initialPending={(pendingRows ?? []).map((r) => r.id)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">{children}</main>
        <div className="bg-sidebar/95 fixed inset-x-0 bottom-0 z-20 border-t px-2 pt-1 pb-[max(env(safe-area-inset-bottom),4px)] backdrop-blur md:hidden">
          <SidebarNav isManager={isManager} variant="bar" />
        </div>
      </div>
    </div>
  );
}
