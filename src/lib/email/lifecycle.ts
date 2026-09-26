import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "./send";
import { templates } from "./templates";
import { PLANS } from "@/lib/billing/plans";

export type LifecycleKind = "welcome" | "nudge_day3" | "two_calls_left" | "trial_ended_calls" | "trial_ended_time" | "subscription_started" | "payment_failed" | "subscription_canceled";

/** Owner's address and first name, from auth (profiles do not store email). */
export async function orgOwner(orgId: string) {
  const db = createAdminClient();
  const { data: m } = await db.from("memberships").select("user_id, profiles!memberships_user_id_fkey(full_name)").eq("org_id", orgId).eq("role", "owner").limit(1).maybeSingle();
  if (!m) return null;
  const { data } = await db.auth.admin.getUserById(m.user_id);
  const email = data.user?.email;
  if (!email) return null;
  return { userId: m.user_id, email, firstName: m.profiles?.full_name?.split(" ")[0] ?? "there" };
}

/** Sends a lifecycle email at most once per org (and per user when given). */
export async function sendLifecycle(orgId: string, kind: LifecycleKind, opts: { userId?: string; reason?: "calls" | "time" } = {}) {
  const db = createAdminClient();
  const { error: logErr } = await db.from("email_log").insert({ org_id: orgId, kind, user_id: opts.userId ?? null });
  if (logErr) return { sent: false, reason: "already sent" };

  const [{ data: org }, owner] = await Promise.all([db.from("organizations").select("name, plan, seat_limit").eq("id", orgId).single(), orgOwner(orgId)]);
  if (!org || !owner) return { sent: false, reason: "no owner" };

  const base = { firstName: owner.firstName, orgName: org.name };
  const mail =
    kind === "welcome" ? templates.welcome(base)
    : kind === "nudge_day3" ? templates.nudge(base)
    : kind === "two_calls_left" ? templates.twoCallsLeft(base)
    : kind === "trial_ended_calls" ? templates.trialEnded({ ...base, reason: "calls" })
    : kind === "trial_ended_time" ? templates.trialEnded({ ...base, reason: "time" })
    : kind === "subscription_started" ? templates.subscriptionStarted({ ...base, plan: PLANS.find((p) => p.id === org.plan)?.name ?? org.plan, seats: org.seat_limit })
    : kind === "payment_failed" ? templates.paymentFailed(base)
    : templates.subscriptionCanceled(base);

  await sendMail({ to: owner.email, ...mail });
  return { sent: true };
}
