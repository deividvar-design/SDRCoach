"use server";

import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailDomain, validateBusinessEmail } from "@/lib/email/business";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { adminEmails } from "@/lib/auth";
import { absoluteUrl } from "@/lib/site";
import { logFunnel } from "@/lib/funnel";
import { reportError } from "@/lib/sentry";
import { countTrialCalls } from "@/lib/billing/usage";
import { repStats } from "@/lib/trial/stats";
import { EXTENSION, EXTENSION_DECIDERS, EXTENSION_TIMELINES, EXTENSION_USE_CASES, MANAGER_INTRO, managerIntroCopy } from "@/content/trial-growth";

const DAY = 86_400_000;
const firstName = (name: string | null | undefined, fallback: string) => (name ?? "").trim().split(/\s+/)[0] || fallback;

export interface ExtensionState {
  error?: string;
  field?: string;
  done?: boolean;
}

const ExtensionSchema = z.object({
  use_case: z.enum(EXTENSION_USE_CASES.map((u) => u.id) as [string, ...string[]], { message: "Pick what you're using the calls for" }),
  people: z.coerce.number({ message: "How many people would use it?" }).int().min(1, "How many people would use it?").max(10000),
  decider: z.enum(EXTENSION_DECIDERS.map((d) => d.id) as [string, ...string[]], { message: "Who decides on tools like this?" }),
  timeline: z.enum(EXTENSION_TIMELINES.map((t) => t.id) as [string, ...string[]], { message: "When would you decide?" }),
  need: z.string().trim().max(600).optional(),
});

/** Five answers go to the admins, who set the number of calls. One open request per workspace, and a week between. */
export async function requestExtension(_prev: ExtensionState, formData: FormData): Promise<ExtensionState> {
  const viewer = await requireViewer();
  if (viewer.org.plan !== "trial") return { error: "Extensions are for trial workspaces." };
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = ExtensionSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check the form", field: String(issue?.path[0] ?? "") };
  }
  const d = parsed.data;
  const db = createAdminClient();
  const { data: last } = await db.from("trial_extension_requests").select("status, decided_at").eq("org_id", viewer.org.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last?.status === "pending") return { error: "You already have a request in. We reply within a day." };
  if (last?.decided_at && Date.now() - new Date(last.decided_at).getTime() < EXTENSION.cooldownDays * DAY) return { error: `We answered a request from your workspace this week. Ask again after ${EXTENSION.cooldownDays} days.` };

  const { error } = await db.from("trial_extension_requests").insert({
    org_id: viewer.org.id,
    user_id: viewer.userId,
    use_case: d.use_case as (typeof EXTENSION_USE_CASES)[number]["id"],
    people: d.people,
    decider: d.decider as (typeof EXTENSION_DECIDERS)[number]["id"],
    timeline: d.timeline as (typeof EXTENSION_TIMELINES)[number]["id"],
    need: d.need ?? null,
    status: "pending",
  });
  if (error) {
    reportError(error, { where: "extension_request", orgId: viewer.org.id });
    return { error: "The request did not save. Try again in a minute." };
  }
  await logFunnel("extension_requested", { subject: viewer.org.id, meta: { use_case: d.use_case, people: d.people, decider: d.decider, timeline: d.timeline } });

  if (emailConfigured()) {
    const label = <T extends { id: string; label: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id)?.label ?? id;
    const calls = await countTrialCalls(db, viewer.org.id);
    const mail = templates.extensionRequested({
      name: viewer.profile.full_name || viewer.email,
      email: viewer.email,
      orgName: viewer.org.name,
      workEmail: classifyEmailDomain(viewer.email).ok,
      callsMade: calls,
      answers: [
        ["Using the calls for:", label(EXTENSION_USE_CASES, d.use_case)],
        ["People who would use it:", String(d.people)],
        ["Who decides:", label(EXTENSION_DECIDERS, d.decider)],
        ["When:", label(EXTENSION_TIMELINES, d.timeline)],
        ["What they need to see:", d.need ?? "(blank)"],
      ],
      spots: `Trial so far: ${calls} of ${viewer.org.trial_call_limit} calls, ends ${new Date(viewer.org.trial_ends_at).toISOString().slice(0, 10)}.`,
    });
    await Promise.all(adminEmails().map((to) => sendMail({ to, ...mail, replyTo: viewer.email }))).catch((err) => reportError(err, { where: "extension_request_email", orgId: viewer.org.id }));
  }
  return { done: true };
}

export interface IntroState {
  error?: string;
  field?: string;
  /** The manager it went to. */
  sentTo?: string;
}

const IntroSchema = z.object({
  manager_name: z.string({ message: "Add your manager's name" }).trim().min(2, "Add your manager's name").max(80),
  manager_email: z.string({ message: "Add your manager's work email" }).trim().toLowerCase().email("Enter a valid email"),
  note: z.string().trim().max(300).optional(),
});

/**
 * One email to the manager, in the rep's name, with the text the rep saw. Work addresses only, never the rep's own,
 * once per address ever, and never to anyone who opted out. The rep hears nothing back from us; replies go to them.
 */
export async function sendManagerIntro(_prev: IntroState, formData: FormData): Promise<IntroState> {
  const viewer = await requireViewer();
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = IntroSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Check the form", field: String(issue?.path[0] ?? "") };
  }
  const d = parsed.data;
  if (d.manager_email === viewer.email.toLowerCase()) return { error: "That's your own address. Add your manager's.", field: "manager_email" };
  // The note goes out under our domain. Links are left to the button, so the note cannot carry a phishing URL.
  if (d.note && /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|ai|app|xyz|info|biz|me|ly|ru|cn|top|link|site)\b)/i.test(d.note)) return { error: "Leave links out of the note. The email already has a button to the trial.", field: "note" };
  const check = await validateBusinessEmail(d.manager_email);
  if (!check.ok) return { error: check.reason === "free" ? "Use your manager's work address, not a personal one." : check.message, field: "manager_email" };

  const db = createAdminClient();
  const [{ count: mine }, { data: prior }] = await Promise.all([
    db.from("manager_intros").select("id", { count: "exact", head: true }).eq("user_id", viewer.userId).not("sent_at", "is", null),
    db.from("manager_intros").select("sent_at, opted_out_at").ilike("manager_email", d.manager_email).limit(5),
  ]);
  if ((mine ?? 0) >= MANAGER_INTRO.maxPerRep) return { error: `You've sent ${MANAGER_INTRO.maxPerRep} already. Forward one of them instead.` };
  if ((prior ?? []).some((p) => p.opted_out_at)) return { error: "That address has asked not to receive emails like this.", field: "manager_email" };
  if ((prior ?? []).some((p) => p.sent_at)) return { error: "Someone already sent an introduction to that address. Forward it to them yourself instead.", field: "manager_email" };

  const stats = await repStats(db, viewer.org.id, viewer.userId);
  const repName = viewer.profile.full_name || viewer.email;
  const { data: row, error } = await db
    .from("manager_intros")
    .insert({ org_id: viewer.org.id, user_id: viewer.userId, manager_name: d.manager_name, manager_email: d.manager_email, note: d.note ?? null })
    .select("id")
    .single();
  if (error || !row) {
    reportError(error ?? new Error("intro insert returned nothing"), { where: "manager_intro", orgId: viewer.org.id });
    return { error: "Could not send it. Try again in a minute." };
  }
  const link = absoluteUrl(`/i/${row.id}`);
  const copy = managerIntroCopy({ managerName: d.manager_name, repName, repEmail: viewer.email, orgName: viewer.org.name, note: d.note ?? null, stats, link });
  try {
    await sendMail({ to: d.manager_email, ...templates.managerIntro({ ...copy, repName, repEmail: viewer.email, link, optOut: absoluteUrl(`/api/email/opt-out?id=${row.id}`) }), fromName: repName, replyTo: viewer.email });
  } catch (err) {
    reportError(err, { where: "manager_intro_email", orgId: viewer.org.id, extra: { intro: row.id } });
    await db.from("manager_intros").delete().eq("id", row.id);
    return { error: "The email could not be sent. Try again in a minute." };
  }
  await db.from("manager_intros").update({ sent_at: new Date().toISOString() }).eq("id", row.id);
  await logFunnel("manager_intro_sent", { subject: viewer.org.id, meta: { intro: row.id, calls: stats.calls } });
  return { sentTo: firstName(d.manager_name, "your manager") };
}
