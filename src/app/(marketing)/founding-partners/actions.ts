"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/demo/session";
import { normaliseSite } from "@/lib/onboarding/draft";
import { spotsLeft } from "@/lib/partners/program";
import { PARTNER } from "@/content/founding-partners";
import { adminEmails } from "@/lib/auth";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { reportError } from "@/lib/sentry";

export interface ApplyState {
  error?: string;
  field?: string;
  done?: boolean;
  /** Echoed back so a failed submit keeps what was typed. */
  values?: Record<string, string>;
}

const DAY = 86_400_000;

const Schema = z.object({
  name: z.string().trim().min(2, "Add your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid work email"),
  role: z.string().trim().max(80).optional(),
  company: z.string().trim().min(2, "Add your company").max(80),
  website: z.string().trim().max(200).optional(),
  sdr_count: z.coerce.number({ message: "How many SDRs make cold calls?" }).int().min(1, "How many SDRs make cold calls?").max(500),
  start_by: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
  kickoff_wanted: z.literal("on").optional(),
  kickoff_times: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(600).optional(),
  consent: z.literal("on", { message: "Tick the box to agree to the founding-partner terms" }),
});

export async function applyForPartnership(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));
  const values = { ...raw };
  delete values.consent;
  // A field people never see. Anything that fills it is a bot; it gets the success screen and nothing is stored.
  if (raw.fp_extra) return { done: true };

  const parsed = Schema.safeParse(Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "")));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check the form", field: String(issue?.path[0] ?? ""), values };
  }
  const d = parsed.data;
  if (d.sdr_count < PARTNER.minReps) return { error: `The pilot is for teams of ${PARTNER.minReps} or more SDRs. The regular free trial is the place to start with fewer.`, field: "sdr_count", values };
  const start = new Date(`${d.start_by}T12:00:00Z`).getTime();
  if (Number.isNaN(start) || start < Date.now() - 2 * DAY || start > Date.now() + 60 * DAY) return { error: "Pick a start date within the next two months.", field: "start_by", values };
  const site = d.website ? normaliseSite(d.website) : null;
  if (d.website && !site) return { error: "That website doesn't look right. Try the form example.com.", field: "website", values };

  const db = createAdminClient();
  const ip = await clientIp();
  const since = new Date(Date.now() - DAY).toISOString();
  const [{ data: open }, { count: fromIp }] = await Promise.all([
    db.from("partner_applications").select("id").eq("email", d.email).in("status", ["pending", "approved"]).limit(1).maybeSingle(),
    ip ? db.from("partner_applications").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since) : Promise.resolve({ count: 0 }),
  ]);
  if (open) return { done: true };
  if ((fromIp ?? 0) >= 3) return { error: "We already have a few applications from this network today. Email us instead and we'll take it from there.", values };

  const { error } = await db.from("partner_applications").insert({
    name: d.name,
    email: d.email,
    role: d.role ?? null,
    company: d.company,
    website: site?.href ?? null,
    sdr_count: d.sdr_count,
    start_by: d.start_by,
    kickoff_wanted: d.kickoff_wanted === "on",
    kickoff_times: d.kickoff_wanted === "on" ? d.kickoff_times ?? null : null,
    notes: d.notes ?? null,
    status: "pending",
    ip,
  });
  if (error) {
    reportError(error, { where: "partner_apply", extra: { company: d.company } });
    return { error: "The application did not save. Try again in a minute.", values };
  }

  if (emailConfigured()) {
    const left = await spotsLeft(db);
    const alert = templates.partnerAdminAlert({ name: d.name, email: d.email, role: d.role ?? null, company: d.company, website: site?.href ?? null, sdrCount: d.sdr_count, startBy: d.start_by, kickoff: d.kickoff_wanted === "on" ? d.kickoff_times || "any time" : null, notes: d.notes ?? null, spotsLeft: left });
    await Promise.all([
      sendMail({ to: d.email, ...templates.partnerApplied({ firstName: d.name.split(/\s+/)[0] ?? "there", company: d.company }) }),
      ...adminEmails().map((to) => sendMail({ to, ...alert, replyTo: d.email })),
    ]).catch((err) => reportError(err, { where: "partner_apply_email", extra: { company: d.company } }));
  }
  return { done: true };
}
