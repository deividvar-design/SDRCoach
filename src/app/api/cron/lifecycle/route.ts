import { timingSafeEqual } from "node:crypto";
import { reportError } from "@/lib/sentry";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { sweepStaleSessions } from "@/lib/calls/sweep";
import { orgManagers, orgOwner } from "@/lib/email/lifecycle";
import { adminEmails } from "@/lib/auth";
import { reasonLabel } from "@/lib/marketing/signup-intent";
import { absoluteUrl } from "@/lib/site";
import { buildWeeklyDigest } from "@/lib/stats/weekly-digest";
import { comebackUntil } from "@/lib/billing/offers";
import { emailConfigured, sendMail } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { unsubscribeUrl } from "@/lib/demo/boss";
import { formatDate } from "@/lib/utils";

export const maxDuration = 300;

const DAY = 86_400_000;

/** Internal alert, once per workspace, to every admin address. Logged like a lifecycle email so it never repeats. */
async function sendStalledAlert(db: ReturnType<typeof createAdminClient>, orgId: string, createdAt: string) {
  if (!emailConfigured()) return { sent: false };
  const { error: logErr } = await db.from("email_log").insert({ org_id: orgId, kind: "stalled_alert" });
  if (logErr) return { sent: false };
  const [owner, { data: org }] = await Promise.all([orgOwner(orgId), db.from("organizations").select("name, trial_domain").eq("id", orgId).single()]);
  if (!owner || !org) return { sent: false };
  const { data: profile } = await db.from("profiles").select("full_name, signup_reason, signup_goal, hero_variant").eq("id", owner.userId).maybeSingle();
  const mail = templates.stalledTrial({
    name: profile?.full_name ?? owner.firstName,
    email: owner.email,
    orgName: org.name,
    domain: org.trial_domain,
    reason: reasonLabel(profile?.signup_reason),
    goal: profile?.signup_goal ?? null,
    variant: profile?.hero_variant ?? null,
    signedUp: formatDate(createdAt),
    adminUrl: absoluteUrl("/admin/signups"),
  });
  await Promise.all(adminEmails().map((to) => sendMail({ to, ...mail })));
  return { sent: true };
}

function authorized(header: string | null, secret: string) {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily (Vercel cron). Emails first, then the sweep, so a slow transcript fetch never starves the mail:
 *  - quick-start emails on days two to four, each skipped once the step is done
 *  - an internal stalled-trial alert when a workspace has not dialed by day three
 *  - three-days-left note to trial workspaces without a subscription
 *  - trial-ended notice for workspaces whose 14 days ran out in the last two weeks
 *  - repair of sessions stuck between states
 * All idempotent (email_log, finalize claim).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = Date.now();
  const results = { quick: 0, stalled: 0, three_days: 0, ended: 0, chased: 0, demo_followups: 0, digests: 0, swept: { failed: 0, finalized: 0 } };

  const { data: trials } = await db.from("organizations").select("id, created_at, trial_ends_at, stripe_subscription_id").eq("plan", "trial").is("stripe_subscription_id", null).gt("trial_ends_at", new Date(now - 30 * DAY).toISOString()).limit(1000);
  for (const org of trials ?? []) {
    const ageDays = (now - new Date(org.created_at).getTime()) / DAY;
    const daysLeft = Math.ceil((new Date(org.trial_ends_at).getTime() - now) / DAY);
    // Quick start, days two to four. Each step is skipped once the workspace has done that thing. Day one is the
    // welcome email, sent when the workspace is created.
    const calls = () => db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", org.id).not("started_at", "is", null);
    if (ageDays >= 1.85 && ageDays < 3) {
      const { count } = await db.from("targets").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("kind", "real");
      if ((count ?? 0) === 0) {
        const r = await sendLifecycle(org.id, "quick_day2").catch((err) => (reportError(err, { where: "cron_quick_day2", orgId: org.id }), { sent: false }));
        if (r.sent) results.quick += 1;
      }
    }
    if (ageDays >= 2.85 && ageDays < 4) {
      const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "scored");
      if ((count ?? 0) === 0) {
        const r = await sendLifecycle(org.id, "quick_day3").catch((err) => (reportError(err, { where: "cron_quick_day3", orgId: org.id }), { sent: false }));
        if (r.sent) results.quick += 1;
      }
    }
    if (ageDays >= 3.85 && ageDays < 5) {
      const { count } = await db.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", org.id);
      if ((count ?? 0) <= 1) {
        const r = await sendLifecycle(org.id, "quick_day4").catch((err) => (reportError(err, { where: "cron_quick_day4", orgId: org.id }), { sent: false }));
        if (r.sent) results.quick += 1;
      }
    }
    // Stalled: three days in and nobody has dialed. One internal email with everything needed to call them.
    if (ageDays >= 2.85 && ageDays < 10 && (await calls()).count === 0) {
      const r = await sendStalledAlert(db, org.id, org.created_at).catch((err) => (reportError(err, { where: "cron_stalled_alert", orgId: org.id }), { sent: false }));
      if (r.sent) results.stalled += 1;
    }
    if (daysLeft > 0 && daysLeft <= 3 && !org.stripe_subscription_id) {
      const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", org.id).not("started_at", "is", null);
      const r = await sendLifecycle(org.id, "three_days_left", { trial: { calls: count ?? 0, daysLeft } }).catch((err) => (reportError(err, { where: "cron_three_days", orgId: org.id }), { sent: false }));
      if (r.sent) results.three_days += 1;
    }
    if (new Date(org.trial_ends_at).getTime() <= now) {
      const r = await sendLifecycle(org.id, "trial_ended").catch((err) => (reportError(err, { where: "cron_trial_ended", orgId: org.id }), { sent: false }));
      if (r.sent) results.ended += 1;
    }
    // After the trial, three touches for workspaces that never bought: a nudge, a question, and a 20% break-up.
    // The next step is chosen from what was already sent, so a missed cron day never skips one.
    const daysSinceEnd = (now - new Date(org.trial_ends_at).getTime()) / DAY;
    if (daysSinceEnd >= 2 && !org.stripe_subscription_id) {
      const { data: sent } = await db.from("email_log").select("kind").eq("org_id", org.id).in("kind", ["chase_1", "chase_feedback", "chase_breakup"]);
      const done = new Set((sent ?? []).map((r) => r.kind));
      const step = !done.has("chase_1") ? "chase_1" : !done.has("chase_feedback") && daysSinceEnd >= 6 ? "chase_feedback" : !done.has("chase_breakup") && daysSinceEnd >= 12 ? "chase_breakup" : null;
      if (step) {
        const opts = step === "chase_1" ? { calls: (await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", org.id).not("started_at", "is", null)).count ?? 0 } : step === "chase_breakup" ? { until: formatDate(comebackUntil(new Date(now))) } : {};
        const r = await sendLifecycle(org.id, step, opts).catch((err) => (reportError(err, { where: `cron_${step}`, orgId: org.id }), { sent: false }));
        if (r.sent) results.chased += 1;
      }
    }
  }

  // Karen demo leads: two days after a scored call, one nudge towards the trial, unless they already signed up.
  if (emailConfigured()) {
    const { data: demos } = await db.from("demo_calls").select("id, email, overall, outcome").eq("status", "scored").is("followup_sent_at", null).lte("created_at", new Date(now - 2 * DAY).toISOString()).gte("created_at", new Date(now - 10 * DAY).toISOString()).limit(200);
    for (const d of demos ?? []) {
      // Claim before sending so overlapping cron runs cannot double-send; release the claim if the send fails.
      const { data: claimed } = await db.from("demo_calls").update({ followup_sent_at: new Date().toISOString() }).eq("id", d.id).is("followup_sent_at", null).select("id").maybeSingle();
      if (!claimed) continue;
      const { data: existing } = await db.from("profiles").select("id").eq("email", d.email).limit(1).maybeSingle();
      if (existing) continue;
      const firstName = d.email.split("@")[0]?.split(/[._-]/)[0] ?? "there";
      const mail = templates.demoFollowUp({ firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1), email: d.email, overall: Number(d.overall ?? 0), outcome: d.outcome ?? "", unsubscribeUrl: unsubscribeUrl(d.id) });
      const ok = await sendMail({ to: d.email, ...mail }).then(() => true).catch((err) => (reportError(err, { where: "cron_demo_followup", extra: { demoId: d.id } }), false));
      if (ok) results.demo_followups += 1;
      else await db.from("demo_calls").update({ followup_sent_at: null }).eq("id", d.id);
    }
  }

  // Monday: last week on the floor, to every manager of a workspace that made calls.
  if (new Date(now).getUTCDay() === 1) {
    const weekKey = new Date(now).toISOString().slice(0, 10);
    const { data: active } = await db.from("call_sessions").select("org_id").gte("created_at", new Date(now - 7 * DAY).toISOString()).not("started_at", "is", null).limit(5000);
    for (const orgId of new Set((active ?? []).map((r) => r.org_id))) {
      const digest = await buildWeeklyDigest(db, orgId, now).catch((err) => (reportError(err, { where: "cron_digest_build", orgId }), null));
      if (!digest || digest.calls === 0) continue;
      for (const manager of await orgManagers(orgId)) {
        const r = await sendLifecycle(orgId, `weekly_digest:${weekKey}`, { userId: manager.userId, to: manager, digest }).catch((err) => (reportError(err, { where: "cron_digest_send", orgId }), { sent: false }));
        if (r.sent) results.digests += 1;
      }
    }
  }

  const swept = await sweepStaleSessions(db, { limit: 10 });
  results.swept = { failed: swept.failed, finalized: swept.finalized };
  return NextResponse.json(results);
}
