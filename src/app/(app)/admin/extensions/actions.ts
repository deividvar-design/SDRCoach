"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTrialExtension } from "@/lib/trial/extend";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { reportError } from "@/lib/sentry";

type Result = { ok: string } | { error: string };

async function requester(db: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await db.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return { email: data?.email ?? null, firstName: (data?.full_name ?? "").trim().split(/\s+/)[0] || "there" };
}

/** Approve with the calls and days you choose; the requester gets them at once and an email saying so. */
export async function approveExtension(id: string, formData: FormData): Promise<Result> {
  const parsed = z.object({ calls: z.coerce.number().int().min(1).max(500), days: z.coerce.number().int().min(0).max(180) }).safeParse({ calls: formData.get("calls"), days: formData.get("days") });
  if (!parsed.success) return { error: "Calls must be 1 to 500 and days 0 to 180." };
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: req } = await db.from("trial_extension_requests").select("id, org_id, user_id, status").eq("id", id).maybeSingle();
  if (!req || req.status !== "pending") return { error: "That request is not pending." };
  const applied = await applyTrialExtension(db, req.org_id, parsed.data);
  if ("error" in applied) return { error: applied.error };
  await db.from("trial_extension_requests").update({ status: "approved", calls: parsed.data.calls, days: parsed.data.days, decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", id);
  await db.from("admin_actions").insert({ admin_email: admin.email, org_id: req.org_id, action: "extension_approved", payload: { request: id, ...parsed.data, trial_ends_at: applied.trialEndsAt, trial_call_limit: applied.callLimit } });
  const { data: org } = await db.from("organizations").select("name").eq("id", req.org_id).maybeSingle();
  const to = await requester(db, req.user_id);
  if (emailConfigured() && to.email) {
    await sendMail({ to: to.email, ...templates.extensionApproved({ firstName: to.firstName, orgName: org?.name ?? "your workspace", calls: parsed.data.calls, days: parsed.data.days }) }).catch((err) => reportError(err, { where: "extension_approved_email", orgId: req.org_id }));
  }
  revalidatePath("/admin/extensions");
  revalidatePath("/admin");
  return { ok: `Added ${parsed.data.calls} calls and ${parsed.data.days} days.` };
}

export async function declineExtension(id: string, formData: FormData): Promise<Result> {
  const note = String(formData.get("note") ?? "").trim().slice(0, 400) || null;
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: req } = await db.from("trial_extension_requests").update({ status: "declined", note, decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", id).eq("status", "pending").select("org_id, user_id").maybeSingle();
  if (!req) return { error: "That request is not pending." };
  await db.from("admin_actions").insert({ admin_email: admin.email, org_id: req.org_id, action: "extension_declined", payload: { request: id, note } });
  const to = await requester(db, req.user_id);
  if (emailConfigured() && to.email) {
    await sendMail({ to: to.email, ...templates.extensionDeclined({ firstName: to.firstName, note }) }).catch((err) => reportError(err, { where: "extension_declined_email", orgId: req.org_id }));
  }
  revalidatePath("/admin/extensions");
  revalidatePath("/admin");
  return { ok: "Declined and told." };
}
