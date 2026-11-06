"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCalls, notifyReward } from "@/lib/rewards/grant";
import { REWARD_BY_KIND, type RewardKind } from "@/lib/rewards/config";
import { logFunnel } from "@/lib/funnel";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { absoluteUrl } from "@/lib/site";
import { accessUrl } from "@/lib/access/links";
import { issueAccessLink } from "@/lib/access/issue";
import { normaliseSite } from "@/lib/onboarding/draft";

export interface AdminState {
  error?: string;
  ok?: string;
}

async function log(adminEmail: string, orgId: string | null, action: string, payload: Record<string, string | number | boolean | null>) {
  await createAdminClient().from("admin_actions").insert({ admin_email: adminEmail, org_id: orgId, action, payload });
}

export async function extendTrial(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = z.object({ days: z.coerce.number().int().min(0).max(365), calls: z.coerce.number().int().min(0).max(1000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter whole numbers." };
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("trial_ends_at, trial_call_limit, plan, stripe_subscription_id").eq("id", orgId).single();
  if (!org) return { error: "Workspace not found." };
  if (org.stripe_subscription_id || (org.plan !== "trial" && org.plan !== "canceled")) return { error: "This workspace is on a paid plan. Extending a trial would lock it out; adjust the plan instead." };
  const base = Math.max(Date.now(), new Date(org.trial_ends_at).getTime());
  const patch = {
    trial_ends_at: new Date(base + parsed.data.days * 86_400_000).toISOString(),
    trial_call_limit: org.trial_call_limit + parsed.data.calls,
    plan: "trial",
  };
  const { error } = await db.from("organizations").update(patch).eq("id", orgId);
  if (error) return { error: error.message };
  await log(admin.email, orgId, "extend_trial", { ...parsed.data, ...patch });
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin");
  return { ok: `Trial extended by ${parsed.data.days} days and ${parsed.data.calls} calls.` };
}

export async function setPlan(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = z
    .object({ plan: z.enum(["trial", "starter", "team", "enterprise", "canceled"]), seat_limit: z.coerce.number().int().min(1).max(1000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a plan and a whole number of seats." };
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("organizations").update(parsed.data).eq("id", orgId);
  if (error) return { error: error.message };
  await log(admin.email, orgId, "set_plan", parsed.data);
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin");
  return { ok: `Plan set to ${parsed.data.plan} with ${parsed.data.seat_limit} seats. Stripe was not changed.` };
}

export async function addNote(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!note) return { error: "Write something." };
  const admin = await requireAdmin();
  await log(admin.email, orgId, "note", { note });
  revalidatePath(`/admin/orgs/${orgId}`);
  return { ok: "Noted." };
}

/** Approve a pasted-link reward: grant it, log it, tell the workspace. Only a pending claim moves. */
export async function approveClaim(claimId: string): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: claim } = await db.from("reward_claims").update({ status: "approved", decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", claimId).eq("status", "pending").select("*").maybeSingle();
  if (!claim) return { error: "That claim was already decided." };
  await grantCalls(db, claim.org_id, { calls: claim.calls, days: claim.days });
  await logFunnel("reward_granted", { subject: claim.org_id, reason: claim.kind, meta: { calls: claim.calls, days: claim.days, auto: false } });
  await log(admin.email, claim.org_id, "approve_reward", { claim: claim.id, kind: claim.kind, calls: claim.calls, days: claim.days });
  await notifyReward(db, claim.org_id, { title: REWARD_BY_KIND[claim.kind as RewardKind].title, calls: claim.calls, days: claim.days });
  revalidatePath("/admin/rewards");
  revalidatePath("/rewards");
  return { ok: true };
}

/** Turn a claim down with a reason the person sees on their rewards page and in an email. They can claim again. */
export async function rejectClaim(claimId: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  const db = createAdminClient();
  const { data: claim } = await db.from("reward_claims").update({ status: "rejected", note, decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", claimId).eq("status", "pending").select("*").maybeSingle();
  if (!claim) return { error: "That claim was already decided." };
  await logFunnel("reward_rejected", { subject: claim.org_id, reason: claim.kind, meta: { note } });
  await log(admin.email, claim.org_id, "reject_reward", { claim: claim.id, kind: claim.kind, note });
  if (emailConfigured() && claim.user_id) {
    const { data } = await db.auth.admin.getUserById(claim.user_id);
    const to = data.user?.email;
    if (to) {
      const { data: profile } = await db.from("profiles").select("full_name").eq("id", claim.user_id).maybeSingle();
      const mail = templates.rewardRejected({ firstName: profile?.full_name?.split(" ")[0] || "there", title: REWARD_BY_KIND[claim.kind as RewardKind].title, note, href: absoluteUrl("/rewards") });
      await sendMail({ to, ...mail }).catch(() => undefined);
    }
  }
  revalidatePath("/admin/rewards");
  revalidatePath("/rewards");
  return { ok: true };
}

export interface AccessLinkState {
  error?: string;
  ok?: string;
  /** The link just created, for the copy button. */
  link?: string;
}

/** An email, a company and a call allowance become a link that creates the account and workspace when opened. */
export async function createAccessLink(_prev: AccessLinkState, formData: FormData): Promise<AccessLinkState> {
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email("Enter a valid email"),
      company: z.string().trim().min(2, "Give the company a name").max(80),
      calls: z.coerce.number().int().min(1).max(1000),
      days: z.coerce.number().int().min(1).max(365),
      note: z.string().trim().max(200).optional(),
      website: z.string().trim().max(200).optional(),
    })
    .safeParse({ email: formData.get("email"), company: formData.get("company"), calls: formData.get("calls"), days: formData.get("days"), note: formData.get("note") || undefined, website: formData.get("website") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const site = parsed.data.website ? normaliseSite(parsed.data.website) : null;
  if (parsed.data.website && !site) return { error: "That website address doesn't look right. Try the form example.com." };
  const admin = await requireAdmin();
  const issued = await issueAccessLink({ email: parsed.data.email, company: parsed.data.company, calls: parsed.data.calls, days: parsed.data.days, note: parsed.data.note ?? null, site, createdBy: admin.email });
  if ("error" in issued) return { error: issued.error };
  await log(admin.email, null, "access_link_created", { link: issued.id, email: parsed.data.email, company: parsed.data.company, calls: parsed.data.calls, days: parsed.data.days, website: site?.href ?? null });
  revalidatePath("/admin/access");
  return { ok: `Link created for ${parsed.data.email}.${issued.draftNote}`, link: accessUrl(issued.token) };
}

export async function revokeAccessLink(id: string): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  const { error } = await createAdminClient().from("access_links").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("claimed_at", null);
  if (error) return { error: error.message };
  await log(admin.email, null, "access_link_revoked", { link: id });
  revalidatePath("/admin/access");
  return { ok: true };
}

/** Sends the link to the address it was made for, from our own template. */
export async function emailAccessLink(id: string): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if (!emailConfigured()) return { error: "Email is not configured." };
  const db = createAdminClient();
  const { data: link } = await db.from("access_links").select("*").eq("id", id).maybeSingle();
  if (!link || link.claimed_at || link.revoked_at) return { error: "That link is not open." };
  try {
    await sendMail({ to: link.email, ...templates.accessLink({ company: link.company, calls: link.calls, days: link.days, link: accessUrl(link.token) }) });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The email could not be sent." };
  }
  await log(admin.email, null, "access_link_emailed", { link: id, email: link.email });
  return { ok: true };
}
