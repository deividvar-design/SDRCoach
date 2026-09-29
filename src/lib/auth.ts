import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
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
    supabase.from("memberships").select("*, organizations(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  // Most recently joined workspace wins, so accepting an invite lands you there.
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

/** Founders' addresses. ADMIN_EMAILS in the environment extends this list. */
const DEFAULT_ADMIN_EMAILS = ["deividvar@gmail.com"];

/** Internal console: allowlisted emails only. Non-admins get a 404 so the route stays invisible. */
export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const list = [...DEFAULT_ADMIN_EMAILS, ...(process.env.ADMIN_EMAILS ?? "").split(",")].map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (!isAdminEmail(viewer.email)) notFound();
  return viewer;
}

/** Like requireViewer but only for managers and owners. */
export async function requireManager() {
  const viewer = await requireViewer();
  if (viewer.membership.role === "rep") redirect("/dashboard");
  return viewer;
}
