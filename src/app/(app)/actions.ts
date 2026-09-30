"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { SITE } from "@/lib/site";

export type FeedbackState = { ok?: true; error?: string };

const schema = z.object({
  body: z.string().trim().min(3, "Say a little more than that.").max(4000, "Keep it under 4,000 characters."),
  page: z.string().max(300).optional(),
  replyOk: z.boolean(),
});

/** Stores the note first, so nothing is lost if email is down, then forwards it to the founders' inbox. */
export async function sendFeedback(input: { body: string; page?: string; replyOk: boolean }): Promise<FeedbackState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the message." };
  const viewer = await requireViewer();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const name = viewer.profile.full_name ?? viewer.email;

  const db = createAdminClient();
  const { error } = await db.from("feedback").insert({
    org_id: viewer.org.id,
    user_id: viewer.userId,
    email: viewer.email,
    name,
    role: viewer.membership.role,
    page: parsed.data.page ?? null,
    user_agent: userAgent,
    body: parsed.data.body,
    reply_ok: parsed.data.replyOk,
  });
  if (error) return { error: "Could not save that. Try again in a moment." };

  try {
    const mail = templates.feedback({ name, email: viewer.email, orgName: viewer.org.name, role: viewer.membership.role, page: parsed.data.page ?? "unknown page", body: parsed.data.body, replyOk: parsed.data.replyOk });
    await sendMail({ to: SITE.company.email, ...mail, replyTo: parsed.data.replyOk ? viewer.email : undefined });
  } catch (err) {
    // The row is saved and shows on the admin console; the email is a convenience.
    console.error("feedback email failed", err);
    Sentry.captureException(err, { tags: { org_id: viewer.org.id }, extra: { where: "feedback_email" } });
  }
  return { ok: true };
}
