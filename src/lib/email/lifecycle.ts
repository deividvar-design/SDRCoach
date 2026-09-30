import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, sendMail } from "./send";
import { templates } from "./templates";
import { PLANS } from "@/lib/billing/plans";

export type LifecycleKind = "welcome" | "nudge_day3" | "two_calls_left" | "trial_ended" | "subscription_started" | "payment_failed" | "subscription_canceled" | `weekly_digest:${string}`;

/** Owner's address and first name. */
export async function orgOwner(orgId: string) {
  const [owner] = await orgManagers(orgId, true);
  return owner ?? null;
}

/** Everyone who manages the workspace (owner first), with an address to write to. */
export async function orgManagers(orgId: string, ownerOnly = false) {
  const db = createAdminClient();
  let q = db.from("memberships").select("user_id, role, profiles!memberships_user_id_fkey(full_name, email)").eq("org_id", orgId).order("created_at");
  q = ownerOnly ? q.eq("role", "owner") : q.in("role", ["owner", "manager"]);
  const { data } = await q;
  const out: { userId: string; email: string; firstName: string }[] = [];
  for (const m of data ?? []) {
    let email = m.profiles?.email ?? null;
    if (!email) {
      const { data: u } = await db.auth.admin.getUserById(m.user_id);
      email = u.user?.email ?? null;
    }
    if (email) out.push({ userId: m.user_id, email, firstName: m.profiles?.full_name?.split(" ")[0] ?? "there" });
  }
  return out.sort((a, b) => Number((data ?? []).find((m) => m.user_id === b.userId)?.role === "owner") - Number((data ?? []).find((m) => m.user_id === a.userId)?.role === "owner"));
}

/** Sends a lifecycle email at most once per org (and per user when given). */
export async function sendLifecycle(orgId: string, kind: LifecycleKind, opts: { userId?: string; reason?: "calls" | "time"; to?: { userId: string; email: string; firstName: string }; digest?: import("@/lib/stats/weekly-digest").WeeklyDigest } = {}) {
  // Without a provider nothing is recorded, so the email still goes out once one is configured.
  if (!emailConfigured()) return { sent: false, reason: "email not configured" };

  const db = createAdminClient();
  const { data: logRow, error: logErr } = await db.from("email_log").insert({ org_id: orgId, kind, user_id: opts.userId ?? null }).select("id").single();
  if (logErr?.code === "23505") return { sent: false, reason: "already sent" };
  if (logErr || !logRow) throw new Error(logErr?.message ?? "email log insert failed");
  const undo = () => db.from("email_log").delete().eq("id", logRow.id);

  const [{ data: org }, owner] = await Promise.all([db.from("organizations").select("name, plan, seat_limit").eq("id", orgId).single(), opts.to ? Promise.resolve(opts.to) : orgOwner(orgId)]);
  if (!org || !owner) {
    await undo();
    return { sent: false, reason: "no owner" };
  }

  const base = { firstName: owner.firstName, orgName: org.name };
  const mail =
    kind === "welcome" ? templates.welcome(base)
    : kind === "nudge_day3" ? templates.nudge(base)
    : kind === "two_calls_left" ? templates.twoCallsLeft(base)
    : kind === "trial_ended" ? templates.trialEnded({ ...base, reason: opts.reason ?? "time" })
    : kind === "subscription_started" ? templates.subscriptionStarted({ ...base, plan: PLANS.find((p) => p.id === org.plan)?.name ?? org.plan, seats: org.seat_limit })
    : kind === "payment_failed" ? templates.paymentFailed(base)
    : kind.startsWith("weekly_digest:") && opts.digest ? templates.weeklyDigest({ ...base, d: opts.digest })
    : templates.subscriptionCanceled(base);

  try {
    await sendMail({ to: owner.email, ...mail });
  } catch (err) {
    await undo();
    throw err;
  }
  return { sent: true };
}
