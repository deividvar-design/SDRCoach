"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { CHECKIN_QUESTIONS } from "@/content/founding-partners";
import { adminEmails } from "@/lib/auth";
import { absoluteUrl } from "@/lib/site";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { reportError } from "@/lib/sentry";

export interface CheckinState {
  error?: string;
  done?: boolean;
  approved?: boolean;
}

/** Saves the day-30 answers. The quote and the numbers are only publishable when the approval box is ticked. */
export async function submitCheckin(token: string, _prev: CheckinState, formData: FormData): Promise<CheckinState> {
  if (!/^[0-9a-f]{48}$/.test(token)) return { error: "This link is not valid." };
  const answers: Record<string, string> = {};
  for (const q of CHECKIN_QUESTIONS) answers[q.key] = String(formData.get(q.key) ?? "").trim().slice(0, 1000);
  const approved = formData.get("approve") === "on";
  if (approved && answers.quote.length < 10) return { error: "Add a sentence or two in the third answer before approving it for publishing." };

  const db = createAdminClient();
  const { data: app } = await db
    .from("partner_applications")
    .update({ checkin: answers, quote: answers.quote || null, quote_approved_at: approved ? new Date().toISOString() : null })
    .eq("report_token", token)
    .select("id, company, name")
    .maybeSingle();
  if (!app) return { error: "This link is not valid." };

  if (emailConfigured()) {
    const lines = [`${app.name} at ${app.company} sent the day-30 check-in.${approved ? " Approved for publishing." : " Not approved for publishing yet."}`, ...CHECKIN_QUESTIONS.map((q) => `${q.label}\n${answers[q.key] || "(no answer)"}`), `Review: ${absoluteUrl("/admin/partners")}`];
    const text = lines.join("\n\n");
    await Promise.all(adminEmails().map((to) => sendMail({ to, subject: `Day-30 check-in: ${app.company}${approved ? " (approved)" : ""}`, text, html: `<pre style="font-family:inherit;white-space:pre-wrap">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>` }))).catch((err) => reportError(err, { where: "partner_checkin_email", extra: { application: app.id } }));
  }
  return { done: true, approved };
}
