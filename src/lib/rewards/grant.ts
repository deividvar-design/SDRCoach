import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Organization, RewardClaim } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailDomain } from "@/lib/email/business";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { logFunnel } from "@/lib/funnel";
import { reportError } from "@/lib/sentry";
import { absoluteUrl } from "@/lib/site";
import { INVITE_REWARD_CAP, REFERRAL_ACTIVATION_CALLS, REFERRAL_PAID_FALLBACK_CALLS, REFERRER_MONTH_COUPON, REWARD_BY_KIND, rewardLine, type RewardKind } from "./config";

type Db = SupabaseClient<Database>;
const DAY = 86_400_000;

/**
 * Add calls (and, on a trial, days) to a workspace. A trial's pool is its call limit, so the grant raises it and
 * pushes the end date; a paid workspace gets a bonus balance that is spent once the month's included calls are gone.
 */
export async function grantCalls(db: Db, orgId: string, grant: { calls: number; days?: number }) {
  const { data: org } = await db.from("organizations").select("id, plan, trial_call_limit, trial_ends_at, bonus_calls").eq("id", orgId).maybeSingle();
  if (!org) return;
  if (org.plan === "trial") {
    const base = Math.max(Date.now(), new Date(org.trial_ends_at).getTime());
    await db
      .from("organizations")
      .update({ trial_call_limit: org.trial_call_limit + grant.calls, ...(grant.days ? { trial_ends_at: new Date(base + grant.days * DAY).toISOString() } : {}) })
      .eq("id", orgId);
    return;
  }
  await db.from("organizations").update({ bonus_calls: org.bonus_calls + grant.calls }).eq("id", orgId);
}

/**
 * A paid workspace that has dialled past its included calls this month is drawing on its bonus balance: take one
 * off per call. Called once per connected call, after the voice usage row is written.
 */
export async function spendBonusCall(db: Db, orgId: string, usedThisWindow: number, includedThisWindow: number) {
  if (usedThisWindow <= includedThisWindow) return;
  const { data: org } = await db.from("organizations").select("bonus_calls").eq("id", orgId).maybeSingle();
  if (!org || org.bonus_calls <= 0) return;
  await db.from("organizations").update({ bonus_calls: org.bonus_calls - 1 }).eq("id", orgId).eq("bonus_calls", org.bonus_calls);
}

async function ownerEmail(db: Db, orgId: string): Promise<{ email: string; firstName: string } | null> {
  const { data: owner } = await db.from("memberships").select("user_id, profiles!memberships_user_id_fkey(full_name)").eq("org_id", orgId).eq("role", "owner").limit(1).maybeSingle();
  if (!owner) return null;
  const { data } = await db.auth.admin.getUserById(owner.user_id);
  const email = data.user?.email;
  if (!email) return null;
  const name = (owner.profiles as { full_name: string | null } | null)?.full_name ?? "";
  return { email, firstName: name.split(" ")[0] || "there" };
}

/** Tell the workspace owner what was added and why. Never throws: a mail failure is logged, the grant stands. */
export async function notifyReward(db: Db, orgId: string, p: { title: string; calls: number; days: number; detail?: string }) {
  if (!emailConfigured()) return;
  try {
    const to = await ownerEmail(db, orgId);
    if (!to) return;
    const mail = templates.rewardGranted({ firstName: to.firstName, title: p.title, line: rewardLine(p.calls, p.days), detail: p.detail ?? null, href: absoluteUrl("/rewards") });
    await sendMail({ to: to.email, ...mail });
  } catch (err) {
    reportError(err, { where: "reward_email", orgId });
  }
}

/** Approve an automatic reward: write the claim, grant it, say so. The unique indexes make a repeat a no-op. */
async function autoApprove(db: Db, orgId: string, kind: RewardKind, extra: Partial<Pick<RewardClaim, "ref_org_id" | "ref_user_id" | "user_id" | "note" | "calls" | "days">> = {}) {
  const spec = REWARD_BY_KIND[kind];
  const calls = extra.calls ?? spec.calls;
  const days = extra.days ?? 0;
  const { data: claim, error } = await db
    .from("reward_claims")
    .insert({ org_id: orgId, kind, status: "approved", calls, days, decided_at: new Date().toISOString(), decided_by: "system", ...extra })
    .select("id")
    .maybeSingle();
  if (error || !claim) return false;
  await grantCalls(db, orgId, { calls, days });
  await logFunnel("reward_granted", { subject: orgId, reason: kind, meta: { calls, days, auto: true } });
  return true;
}

/**
 * After a connected call: an invited rep's first call pays the inviter's workspace, and a referred workspace's third
 * call pays the referrer. Both are idempotent through the unique indexes on reward_claims.
 */
export async function rewardsAfterCall(db: Db, p: { orgId: string; userId: string; connectedCalls: number }) {
  try {
    await inviteReward(db, p.orgId, p.userId);
  } catch (err) {
    reportError(err, { where: "reward_invite", orgId: p.orgId });
  }
  try {
    if (p.connectedCalls === REFERRAL_ACTIVATION_CALLS) await referralTrialReward(db, p.orgId);
  } catch (err) {
    reportError(err, { where: "reward_referral_trial", orgId: p.orgId });
  }
}

async function inviteReward(db: Db, orgId: string, userId: string) {
  // First connected call by this person in this workspace?
  const { count: theirCalls } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("user_id", userId).not("started_at", "is", null).neq("status", "failed");
  if ((theirCalls ?? 0) !== 1) return;
  const { data: membership } = await db.from("memberships").select("role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  if (!membership || membership.role === "owner") return;
  const { data: user } = await db.auth.admin.getUserById(userId);
  const email = user.user?.email?.toLowerCase();
  if (!email) return;
  // Only reps who arrived through an invite, with a work address.
  const { data: invite } = await db.from("invites").select("id, invited_by").eq("org_id", orgId).eq("email", email).not("accepted_at", "is", null).limit(1).maybeSingle();
  if (!invite) return;
  if (!classifyEmailDomain(email).ok) return;
  const { count: rewarded } = await db.from("reward_claims").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("kind", "invite_rep").eq("status", "approved");
  if ((rewarded ?? 0) >= INVITE_REWARD_CAP) return;
  const name = (await db.from("profiles").select("full_name").eq("id", userId).maybeSingle()).data?.full_name ?? email;
  const ok = await autoApprove(db, orgId, "invite_rep", { ref_user_id: userId, user_id: invite.invited_by, note: name });
  if (ok) await notifyReward(db, orgId, { title: REWARD_BY_KIND.invite_rep.title, calls: REWARD_BY_KIND.invite_rep.calls, days: 0, detail: `${name} made a first call.` });
}

async function referralTrialReward(db: Db, referredOrgId: string) {
  const { data: org } = await db.from("organizations").select("name, referred_by_org_id").eq("id", referredOrgId).maybeSingle();
  if (!org?.referred_by_org_id) return;
  const spec = REWARD_BY_KIND.referral_trial;
  const ok = await autoApprove(db, org.referred_by_org_id, "referral_trial", { ref_org_id: referredOrgId, note: org.name });
  if (ok) await notifyReward(db, org.referred_by_org_id, { title: spec.title, calls: spec.calls, days: 0, detail: `${org.name} made their first ${REFERRAL_ACTIVATION_CALLS} calls.` });
}

/**
 * A referred workspace subscribed: the referrer gets a month free, applied to their next Stripe invoice when they
 * pay monthly, or a block of calls when they are on a trial or a longer billing period. Called from the webhook.
 */
export async function referralPaidReward(referredOrgId: string, applyFreeMonth: (subscriptionId: string, coupon: string) => Promise<void>) {
  const db = createAdminClient();
  const { data: referred } = await db.from("organizations").select("name, referred_by_org_id").eq("id", referredOrgId).maybeSingle();
  if (!referred?.referred_by_org_id) return;
  const { data: referrer } = await db.from("organizations").select("id, plan, stripe_subscription_id, billing_interval").eq("id", referred.referred_by_org_id).maybeSingle();
  if (!referrer) return;
  const monthly = Boolean(referrer.stripe_subscription_id) && referrer.billing_interval === "month" && referrer.plan !== "canceled" && referrer.plan !== "trial";
  const ok = await autoApprove(db, referrer.id, "referral_paid", { ref_org_id: referredOrgId, note: referred.name, calls: monthly ? 0 : REFERRAL_PAID_FALLBACK_CALLS });
  if (!ok) return;
  if (monthly && referrer.stripe_subscription_id) {
    try {
      await applyFreeMonth(referrer.stripe_subscription_id, REFERRER_MONTH_COUPON);
    } catch (err) {
      // The coupon could not be applied: fall back to calls so the reward is never silently lost.
      reportError(err, { where: "reward_referral_month", orgId: referrer.id });
      await grantCalls(db, referrer.id, { calls: REFERRAL_PAID_FALLBACK_CALLS });
      await db.from("reward_claims").update({ calls: REFERRAL_PAID_FALLBACK_CALLS, note: `${referred.name} (coupon failed, calls instead)` }).eq("org_id", referrer.id).eq("kind", "referral_paid").eq("ref_org_id", referredOrgId);
      await notifyReward(db, referrer.id, { title: "A team you referred subscribed", calls: REFERRAL_PAID_FALLBACK_CALLS, days: 0, detail: `${referred.name} is now a customer.` });
      return;
    }
    await notifyReward(db, referrer.id, { title: "A team you referred subscribed", calls: 0, days: 0, detail: `${referred.name} is now a customer. Your next month is free: the discount is on your next invoice.` });
    return;
  }
  await notifyReward(db, referrer.id, { title: "A team you referred subscribed", calls: REFERRAL_PAID_FALLBACK_CALLS, days: 0, detail: `${referred.name} is now a customer.` });
}

/** Attach a referral to a new workspace from the code the browser arrived with. Self-referrals and unknown codes are ignored. */
export async function attachReferral(db: Db, orgId: string, code: string | null | undefined) {
  if (!code || !/^[a-z0-9]{6,12}$/.test(code)) return;
  const { data: referrer } = await db.from("organizations").select("id").eq("referral_code", code).maybeSingle();
  if (!referrer || referrer.id === orgId) return;
  await db.from("organizations").update({ referred_by_org_id: referrer.id }).eq("id", orgId).is("referred_by_org_id", null);
  await logFunnel("referral_signup", { subject: orgId, meta: { referrer: referrer.id } });
}

export type { Organization };
