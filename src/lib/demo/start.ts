import "server-only";
import { track } from "@vercel/analytics/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailDomain, emailDomain, hasMx } from "@/lib/email/business";
import { checkDemoLimits, sendDemoScorecard } from "@/lib/demo/boss";
import { clientIp } from "@/lib/demo/session";
import { newShareSlug } from "@/lib/demo/share";
import { logFunnel } from "@/lib/funnel";
import { readAdClick } from "@/lib/ads/click";

/** What each refusal says to the caller. Shared by the call button, the Google button, One Tap and the email step. */
export const DEMO_ERRORS: Record<string, string> = {
  invalid: "Enter a valid email address.",
  disposable: "Temporary addresses can't receive the scorecard. Use one you can read it at.",
  no_mx: "That domain can't receive email. Check the spelling.",
  already_played: "That address has already had its go. Karen remembers. Start a free trial to call her again.",
  domain_limit: "Three people from your company have already called Karen today. Try again tomorrow, or start a free trial.",
  ip_limit: "Karen has had enough calls from this connection today. Try again tomorrow.",
  insert_failed: "Something went wrong. Try again in a minute.",
  expired: "That call is no longer on file. Start again.",
};

export type StartResult = { id: string } | { waitlisted: true } | { error: string; code: string };
export type StartMethod = "email" | "google" | "call";

/** Any real address, personal ones flagged so the scorecard asks for a work email before a trial. */
function classify(raw: string): { email: string; domain: string | null; personal: boolean; reject: string | null } {
  const email = raw.trim().toLowerCase();
  const listed = classifyEmailDomain(email);
  const personal = !listed.ok && listed.reason === "free";
  if (!listed.ok && !personal) return { email, domain: null, personal: false, reject: listed.reason };
  const domain = listed.ok ? listed.domain : emailDomain(email)!;
  return { email, domain, personal, reject: null };
}

const skipMx = (method: StartMethod) => process.env.SDRCOACH_DEMO === "1" || process.env.SKIP_MX_CHECK === "1" || method === "google";

/**
 * One Karen call. The call button starts without an email: the caller is asked where to send the scorecard once
 * Karen has hung up (attachDemoEmail). Google sign-in and One Tap arrive with an address and keep the per-address
 * rule. Every outcome is logged to the funnel.
 */
export async function startDemo(p: { email?: string | null; company?: string | null; newsletter?: boolean; method: StartMethod }): Promise<StartResult> {
  const company = p.company?.replace(/\s+/g, " ").trim() || null;
  const known = p.email ? classify(p.email) : null;
  await logFunnel("karen_submit", { email: known?.email, meta: { company: Boolean(company), method: p.method } });

  const reject = async (code: string): Promise<StartResult> => {
    await logFunnel("karen_rejected", { email: known?.email, reason: code, meta: { method: p.method } });
    return { error: DEMO_ERRORS[code] ?? "Try again later.", code };
  };

  if (known?.reject) return reject(known.reject);
  if (known && !skipMx(p.method) && !(await hasMx(known.domain!))) return reject("no_mx");

  const db = createAdminClient();
  const ip = await clientIp();
  const limit = await checkDemoLimits(db, { email: known?.email ?? null, domain: known?.domain ?? null, ip, personal: known?.personal ?? false });
  if (limit === "busy") {
    // Keep the lead when there is one, skip the call. The row counts against nothing since it never connects.
    if (known) await db.from("demo_calls").insert({ email: known.email, domain: known.domain, ip, company, personal_email: known.personal, newsletter: Boolean(p.newsletter), status: "failed", error: "daily cap" });
    await logFunnel("karen_rejected", { email: known?.email, reason: "busy", meta: { method: p.method } });
    return { waitlisted: true };
  }
  if (limit) return reject(limit);

  const click = await readAdClick();
  const { data: demo, error } = await db
    .from("demo_calls")
    .insert({
      email: known?.email ?? null,
      domain: known?.domain ?? null,
      ip,
      company,
      personal_email: known?.personal ?? false,
      newsletter: Boolean(p.newsletter),
      share_slug: newShareSlug(),
      email_added_at: known ? new Date().toISOString() : null,
      method: p.method,
      ...click,
    })
    .select("id")
    .single();
  if (error || !demo) return reject("insert_failed");

  await track("demo_started", { domain: known?.domain ?? "", personal: known?.personal ?? false, method: p.method }).catch(() => {});
  return { id: demo.id };
}

export type AttachResult = { ok: true; personal: boolean } | { error: string; code: string };

/**
 * The email step after the call: validate the address, store it on the call, and send the scorecard if the coach
 * has finished. The per-address rule is not applied here, the call has already happened; it applies to the next one.
 */
export async function attachDemoEmail(demoId: string, raw: string, opts: { company?: string | null; newsletter?: boolean } = {}): Promise<AttachResult> {
  const known = classify(raw);
  const reject = async (code: string): Promise<AttachResult> => {
    await logFunnel("karen_rejected", { email: known.email, reason: code, meta: { method: "after_call" } });
    return { error: DEMO_ERRORS[code] ?? "Try again.", code };
  };
  if (known.reject) return reject(known.reject);
  if (!skipMx("email") && !(await hasMx(known.domain!))) return reject("no_mx");

  const db = createAdminClient();
  const company = opts.company?.replace(/\s+/g, " ").trim() || null;
  const { data: updated, error } = await db
    .from("demo_calls")
    .update({ email: known.email, domain: known.domain, personal_email: known.personal, email_added_at: new Date().toISOString(), ...(company ? { company } : {}), ...(opts.newsletter ? { newsletter: true } : {}) })
    .eq("id", demoId)
    .is("email", null)
    .select("id, status")
    .maybeSingle();
  if (error) return reject("insert_failed");
  if (!updated) {
    // Already attached by a double submit; nothing more to do.
    const { data: existing } = await db.from("demo_calls").select("personal_email").eq("id", demoId).maybeSingle();
    return { ok: true, personal: existing?.personal_email ?? known.personal };
  }
  await logFunnel("karen_email", { email: known.email, subject: demoId, dedupeKey: `karen_email:${demoId}`, meta: { personal: known.personal } });
  if (updated.status === "scored") await sendDemoScorecard(demoId);
  return { ok: true, personal: known.personal };
}

export const DEMO_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 3 * 60 * 60 };
