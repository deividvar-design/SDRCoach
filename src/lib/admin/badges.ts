import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/** The admin sections, in nav order. */
export const ADMIN_SECTIONS = [
  { key: "signups", href: "/admin/signups", label: "Signups" },
  { key: "leads", href: "/admin/leads", label: "Karen leads" },
  { key: "usage", href: "/admin/usage", label: "Usage" },
  { key: "rewards", href: "/admin/rewards", label: "Rewards" },
  { key: "extensions", href: "/admin/extensions", label: "Extensions" },
  { key: "access", href: "/admin/access", label: "Access links" },
  { key: "partners", href: "/admin/partners", label: "Partners" },
  { key: "affiliates", href: "/admin/affiliates", label: "Affiliates" },
  { key: "sounds", href: "/admin/sounds", label: "Background sounds" },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

/** Red is a decision waiting for you; grey is what arrived since you last opened the section. */
export type Badge = { action: number; fresh: number };

type Db = ReturnType<typeof createAdminClient>;
const EPOCH = "1970-01-01T00:00:00Z";

/** Counts for every section, for one admin. Each "fresh" count is relative to that admin's own last visit. */
/** Keyed on the email alone so the page title and the page body share one set of counts per request. */
export const adminBadges = (_db: Db, adminEmail: string) => badgesFor(adminEmail);

const badgesFor = cache(async (adminEmail: string): Promise<Record<AdminSection, Badge>> => {
  const db = createAdminClient();
  const { data: seenRows } = await db.from("admin_seen").select("section, seen_at").eq("admin_email", adminEmail);
  const seen = new Map((seenRows ?? []).map((r) => [r.section, r.seen_at]));
  const since = (s: AdminSection) => seen.get(s) ?? EPOCH;
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [signups, leads, rewards, extensions, access, partnersPending, partnersCheckins, affiliates] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true }).gt("created_at", since("signups"))),
    count(db.from("demo_calls").select("id", { count: "exact", head: true }).eq("status", "scored").gt("created_at", since("leads"))),
    count(db.from("reward_claims").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(db.from("trial_extension_requests").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(db.from("access_links").select("id", { count: "exact", head: true }).gt("claimed_at", since("access"))),
    count(db.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(db.from("partner_applications").select("id", { count: "exact", head: true }).gt("quote_approved_at", since("partners"))),
    count(db.from("affiliates").select("id", { count: "exact", head: true }).gt("created_at", since("affiliates"))),
  ]);
  return {
    signups: { action: 0, fresh: signups },
    leads: { action: 0, fresh: leads },
    usage: { action: 0, fresh: 0 },
    rewards: { action: rewards, fresh: 0 },
    extensions: { action: extensions, fresh: 0 },
    access: { action: 0, fresh: access },
    // A manager who approved a quote is waiting for the testimonial to be made from it.
    partners: { action: partnersPending + partnersCheckins, fresh: 0 },
    affiliates: { action: 0, fresh: affiliates },
    sounds: { action: 0, fresh: 0 },
  };
});

/** Opening a section marks it seen for this admin; the next visit to the admin home counts from now. */
export async function markSeen(db: Db, adminEmail: string, section: AdminSection) {
  await db.from("admin_seen").upsert({ admin_email: adminEmail, section, seen_at: new Date().toISOString() }, { onConflict: "admin_email,section" });
}

export function totalAction(badges: Record<AdminSection, Badge>) {
  return Object.values(badges).reduce((n, b) => n + b.action, 0);
}
