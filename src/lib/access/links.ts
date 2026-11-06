import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRACTICE_PERSONAS } from "@/content/practice-personas";
import { BOSS_PERSONAS } from "@/content/boss-personas";
import { logFunnel } from "@/lib/funnel";
import { absoluteUrl } from "@/lib/site";
import { isPast } from "@/lib/utils";
import { VOICE_IDS } from "@/lib/domain/voices";
import type { AccessLink, Json } from "@/types/database";
import type { WorkspaceDraft } from "@/lib/onboarding/draft";
import { pilotSeats } from "@/content/founding-partners";

export const ACCESS_LINK_DAYS = 30;

export function accessUrl(token: string) {
  return absoluteUrl(`/welcome/${token}`);
}

export type LinkStatus = "open" | "claimed" | "expired" | "revoked";

export function linkStatus(l: Pick<AccessLink, "claimed_at" | "revoked_at" | "expires_at">): LinkStatus {
  if (l.claimed_at) return "claimed";
  if (l.revoked_at) return "revoked";
  if (isPast(l.expires_at)) return "expired";
  return "open";
}

/** The link a visitor opened, if it can still be used. */
export async function openAccessLink(token: string): Promise<AccessLink | null> {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const { data } = await createAdminClient().from("access_links").select("*").eq("token", token).maybeSingle();
  return data && linkStatus(data) === "open" ? data : null;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** What is stored on the link: the draft without its token usage. */
export type StoredDraft = Omit<WorkspaceDraft, "usage">;

export function storedDraft(value: Json | null): StoredDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const d = value as Partial<StoredDraft>;
  if (typeof d.company_description !== "string" || typeof d.product_description !== "string" || typeof d.ideal_customer_profile !== "string") return null;
  return d as StoredDraft;
}

export type ClaimResult = { ok: true; email: string; orgId: string; targetId: string | null } | { error: string; code: "invalid" | "exists" | "failed" };

/**
 * Turns a link into an account and a workspace: the auth user with the chosen password, the organisation with the
 * link's call allowance and trial length, the built-in prospects, and the link marked claimed. No domain rule: the
 * admin vouched for this person. An address that already has an account is sent to sign in instead; a link never
 * changes an existing account's password.
 */
export async function claimAccessLink(token: string, p: { password: string; fullName?: string | null }): Promise<ClaimResult> {
  const link = await openAccessLink(token);
  if (!link) return { error: "This link is no longer valid.", code: "invalid" };
  const db = createAdminClient();
  const email = link.email.trim().toLowerCase();

  const { data: created, error: userError } = await db.auth.admin.createUser({ email, password: p.password, email_confirm: true, user_metadata: { full_name: p.fullName ?? "" } });
  if (userError || !created.user) {
    const msg = userError?.message ?? "";
    if (/already|exists|registered/i.test(msg)) return { error: "An account with this email already exists. Sign in instead.", code: "exists" };
    return { error: "The account could not be created. Try again in a minute.", code: "failed" };
  }
  const userId = created.user.id;

  const slug = `${slugify(link.company) || "team"}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: orgId, error: orgError } = await db.rpc("create_organization", { p_name: link.company, p_slug: slug, p_user_id: userId, p_trial_domain: null });
  if (orgError || !orgId) return { error: "The workspace could not be created. Try again in a minute.", code: "failed" };

  const trialEnds = new Date(Date.now() + link.days * 86_400_000).toISOString();
  await db.from("organizations").update({ trial_call_limit: link.calls, trial_ends_at: trialEnds }).eq("id", orgId);
  await db.from("targets").insert([
    ...PRACTICE_PERSONAS.map((t) => ({ ...t, pain_points: [...t.pain_points], objections: [...t.objections], org_id: orgId, created_by: userId, kind: "practice" as const })),
    ...BOSS_PERSONAS.map((t) => ({ ...t, pain_points: [...t.pain_points], objections: [...t.objections], org_id: orgId, created_by: userId, kind: "boss" as const })),
  ]);
  // The context drafted from their website when the link was made, and the first buyer to call, so the first
  // screen they see is the dial screen rather than a form.
  let targetId: string | null = null;
  const draft = storedDraft(link.draft);
  if (draft) {
    await db.from("organizations").update({ company_description: draft.company_description, product_description: draft.product_description, ideal_customer_profile: draft.ideal_customer_profile }).eq("id", orgId);
    if (draft.target) {
      const { voice_id, ...t } = draft.target;
      const { data: row } = await db
        .from("targets")
        .insert({ ...t, pain_points: [...t.pain_points], objections: [...t.objections], voice_id: VOICE_IDS.includes(voice_id) ? voice_id : null, org_id: orgId, created_by: userId, kind: "practice" })
        .select("id")
        .maybeSingle();
      targetId = row?.id ?? null;
    }
  }
  await db.from("access_links").update({ claimed_at: new Date().toISOString(), org_id: orgId, user_id: userId }).eq("id", link.id);
  // A founding partner's link: a seat for every pilot rep, and, while the spot is still theirs, the founding price
  // at checkout. A team whose spot was released for not starting keeps the seats but not the price.
  const { data: partner } = await db.from("partner_applications").select("id, sdr_count, status").eq("access_link_id", link.id).in("status", ["approved", "released"]).maybeSingle();
  if (partner) await db.from("organizations").update({ seat_limit: pilotSeats(partner.sdr_count), ...(partner.status === "approved" ? { partner_since: new Date().toISOString() } : {}) }).eq("id", orgId);
  await logFunnel("signup_completed", { email, subject: userId, dedupeKey: `signup_completed:${userId}`, meta: { provider: "access_link", link: link.id, enriched: Boolean(draft) } });
  return { ok: true, email, orgId, targetId };
}
