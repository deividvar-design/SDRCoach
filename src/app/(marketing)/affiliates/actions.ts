"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/demo/session";
import { newAffiliateCode } from "@/lib/affiliates/codes";
import { affiliateLink } from "@/lib/affiliates/program";
import { AFFILIATE } from "@/content/affiliates";
import { logFunnel } from "@/lib/funnel";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { reportError } from "@/lib/sentry";

export interface JoinState {
  error?: string;
  field?: string;
  /** The link, shown on the page as well as emailed. */
  link?: string;
  values?: Record<string, string>;
}

const Schema = z.object({
  name: z.string({ message: "Add your name" }).trim().min(2, "Add your name").max(80),
  email: z.string({ message: "Enter a valid email" }).trim().toLowerCase().email("Enter a valid email"),
  channel: z.string().trim().max(200).optional(),
  payout_method: z.enum(["paypal", "bank"], { message: "Choose how you want to be paid" }),
  payout_details: z.string({ message: "Add where to send the money" }).trim().min(4, "Add where to send the money").max(300),
  terms: z.literal("on", { message: "Tick the box to accept the programme terms" }),
});

export async function joinAffiliates(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));
  const values = { ...raw };
  delete values.terms;
  // Hidden from people; a bot that fills it gets the success screen and nothing is stored.
  if (raw.af_extra) return { link: affiliateLink("thankyou") };

  const parsed = Schema.safeParse(Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "")));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check the form", field: String(issue?.path[0] ?? ""), values };
  }
  const d = parsed.data;
  const db = createAdminClient();
  const ip = await clientIp();

  // The same address gets its existing link back rather than a second account.
  const { data: existing } = await db.from("affiliates").select("code, status").ilike("email", d.email.replace(/[%_\\]/g, (c) => `\\${c}`)).maybeSingle();
  if (existing) return existing.status === "active" ? { link: affiliateLink(existing.code) } : { error: "This account is closed. Reply to any of our emails if you think that is wrong.", values };

  const { count: fromIp } = ip ? await db.from("affiliates").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()) : { count: 0 };
  if ((fromIp ?? 0) >= 3) return { error: "A few accounts were created from this network today. Email us and we'll set yours up by hand.", values };

  let code: string;
  try {
    code = await newAffiliateCode(db);
  } catch (err) {
    reportError(err, { where: "affiliate_code" });
    return { error: "Could not create your link. Try again in a minute.", values };
  }
  const { data: row, error } = await db
    .from("affiliates")
    .insert({ name: d.name, email: d.email, code, channel: d.channel ?? null, payout_method: d.payout_method, payout_details: d.payout_details, status: "active", terms_accepted_at: new Date().toISOString(), ip })
    .select("id")
    .single();
  if (error || !row) {
    reportError(error ?? new Error("affiliate insert returned nothing"), { where: "affiliate_join" });
    return { error: "Could not create your link. Try again in a minute.", values };
  }
  const link = affiliateLink(code);
  await logFunnel("affiliate_joined", { email: d.email, subject: row.id });
  if (emailConfigured()) {
    await sendMail({ to: d.email, ...templates.affiliateWelcome({ firstName: d.name.split(/\s+/)[0] ?? "there", link, sharePercent: AFFILIATE.sharePercent, months: AFFILIATE.earningMonths, minimum: AFFILIATE.minimumPayout }) }).catch((err) => reportError(err, { where: "affiliate_welcome_email", extra: { affiliate: row.id } }));
  }
  return { link };
}
