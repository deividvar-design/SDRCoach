import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Organization, Profile } from "@/types/database";

export interface Viewer {
  userId: string;
  email: string;
  profile: Profile;
  membership: Membership;
  org: Organization;
}

/** Signed-in user plus their active org, or redirect to the right place. Cached per request. */
export const requireViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("memberships").select("*, organizations(*)").eq("user_id", user.id).order("created_at"),
  ]);

  const membership = memberships?.[0] as (Membership & { organizations: Organization }) | undefined;
  if (!membership) redirect("/onboarding");

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profile ?? { id: user.id, full_name: null, avatar_url: null, created_at: "" },
    membership,
    org: membership.organizations,
  };
});

/** Like requireViewer but only for managers and owners. */
export async function requireManager() {
  const viewer = await requireViewer();
  if (viewer.membership.role === "rep") redirect("/dashboard");
  return viewer;
}
