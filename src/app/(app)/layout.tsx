import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  const isManager = canManage(viewer.membership.role);

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r p-3 md:flex">
        <Link href="/dashboard" className="px-2 py-3">
          <Logo />
        </Link>
        <div className="text-muted-foreground mb-4 truncate px-3 text-xs">{viewer.org.name}</div>
        <SidebarNav isManager={isManager} />
        <div className="mt-auto">
          <UserMenu
            name={viewer.profile.full_name ?? viewer.email}
            email={viewer.email}
            avatarUrl={viewer.profile.avatar_url}
            role={ROLE_LABEL[viewer.membership.role]}
          />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Logo />
          <UserMenu name={viewer.profile.full_name ?? viewer.email} email={viewer.email} avatarUrl={viewer.profile.avatar_url} role={ROLE_LABEL[viewer.membership.role]} />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">{children}</main>
        <nav className="bg-sidebar sticky bottom-0 border-t px-2 py-1 md:hidden">
          <SidebarNav isManager={isManager} />
        </nav>
      </div>
    </div>
  );
}
