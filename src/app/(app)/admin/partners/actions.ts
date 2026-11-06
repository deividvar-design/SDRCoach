"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueAccessLink } from "@/lib/access/issue";
import { accessUrl } from "@/lib/access/links";
import { normaliseSite } from "@/lib/onboarding/draft";
import { spotsLeft } from "@/lib/partners/program";
import { PARTNER, pilotCalls } from "@/content/founding-partners";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { reportError } from "@/lib/sentry";

type Result = { ok: string } | { error: string };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "there";

async function log(adminEmail: string, action: string, payload: Record<string, string | number | boolean | null>) {
  await createAdminClient().from("admin_actions").insert({ admin_email: adminEmail, org_id: null, action, payload });
}

/**
 * Approve: issue the pilot's access link (drafted from their website) and send the partner welcome with it.
 * The spot is held from this moment; the cron releases it if nobody dials within the release window.
 */
export async function approvePartner(id: string): Promise<Result> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: app } = await db.from("partner_applications").select("*").eq("id", id).maybeSingle();
  if (!app || app.status !== "pending") return { error: "That application is not pending." };
  if ((await spotsLeft(db)) <= 0) return { error: `All ${PARTNER.spots} spots are taken. Release or complete one first.` };

  const calls = pilotCalls(app.sdr_count);
  const site = app.website ? normaliseSite(app.website) : null;
  const issued = await issueAccessLink({ email: app.email, company: app.company, calls, days: PARTNER.pilotDays, note: "Founding partner", site, createdBy: admin.email });
  if ("error" in issued) return { error: issued.error };

  // Claim the application only if it is still pending, so a double click cannot approve twice.
  const { data: claimed } = await db.from("partner_applications").update({ status: "approved", access_link_id: issued.id, decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (!claimed) {
    await db.from("access_links").update({ revoked_at: new Date().toISOString() }).eq("id", issued.id);
    return { error: "Someone else decided this application a moment ago." };
  }
  await log(admin.email, "partner_approved", { application: id, company: app.company, calls, link: issued.id });

  let mailNote = " Email not sent: email is not configured.";
  if (emailConfigured()) {
    const reps = Math.min(app.sdr_count, PARTNER.maxReps);
    mailNote = await sendMail({ to: app.email, ...templates.partnerApproved({ firstName: firstName(app.name), company: app.company, calls, reps, days: PARTNER.pilotDays, link: accessUrl(issued.token), startWithinDays: PARTNER.startWithinDays, callsPerRepPerWeek: PARTNER.callsPerRepPerWeek, weeks: PARTNER.weeks }) })
      .then(() => " Welcome email sent with the link.")
      .catch((err) => (reportError(err, { where: "partner_approve_email", extra: { application: id } }), " The welcome email failed: copy the link from Access links and send it yourself."));
  }
  revalidatePath("/admin/partners");
  return { ok: `${app.company} approved: ${calls} calls over ${PARTNER.pilotDays} days.${issued.draftNote}${mailNote}` };
}

/** Decline, with a short note that points them at the regular trial. */
export async function declinePartner(id: string, notify: boolean): Promise<Result> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: app } = await db.from("partner_applications").update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", id).eq("status", "pending").select("*").maybeSingle();
  if (!app) return { error: "That application is not pending." };
  await log(admin.email, "partner_declined", { application: id, company: app.company, notified: notify });
  if (notify && emailConfigured()) {
    await sendMail({ to: app.email, ...templates.partnerDeclined({ firstName: firstName(app.name), company: app.company }) }).catch((err) => reportError(err, { where: "partner_decline_email", extra: { application: id } }));
  }
  revalidatePath("/admin/partners");
  return { ok: `${app.company} declined${notify ? " and told" : ""}.` };
}
