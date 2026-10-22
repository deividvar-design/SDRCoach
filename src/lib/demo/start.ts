import "server-only";
import { track } from "@vercel/analytics/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailDomain, emailDomain, hasMx } from "@/lib/email/business";
import { checkDemoLimits } from "@/lib/demo/boss";
import { clientIp } from "@/lib/demo/session";
import { newShareSlug } from "@/lib/demo/share";
import { logFunnel } from "@/lib/funnel";
import { readAdClick } from "@/lib/ads/click";

/** What each refusal says to the caller. Shared by the form, the Google button and One Tap. */
export const DEMO_ERRORS: Record<string, string> = {
  invalid: "Enter a valid email address.",
  disposable: "Temporary addresses can't call Karen. Use one you can read the scorecard at.",
  no_mx: "That domain can't receive email. Check the spelling.",
  already_played: "That address has already had its go. Karen remembers. Start a free trial to call her again.",
  domain_limit: "Three people from your company have already called Karen today. Try again tomorrow, or start a free trial.",
  ip_limit: "Karen has had enough calls from this connection today. Try again tomorrow.",
  insert_failed: "Something went wrong. Try again in a minute.",
};

export type StartResult = { id: string } | { waitlisted: true } | { error: string; code: string };

/**
 * One Karen call for one address. Any real address can call once; a personal one is flagged so the scorecard asks
 * for a work email before a trial, and it skips the per-company cap that would lump every Gmail caller together.
 * Every outcome is logged to the funnel.
 */
export async function startDemo(p: { email: string; company?: string | null; newsletter?: boolean; method: "email" | "google" }): Promise<StartResult> {
  const email = p.email.trim().toLowerCase();
  const company = p.company?.replace(/\s+/g, " ").trim() || null;
  await logFunnel("karen_submit", { email, meta: { company: Boolean(company), method: p.method } });

  const reject = async (code: string): Promise<StartResult> => {
    await logFunnel("karen_rejected", { email, reason: code, meta: { method: p.method } });
    return { error: DEMO_ERRORS[code] ?? "Try again later.", code };
  };

  const listed = classifyEmailDomain(email);
  const personal = !listed.ok && listed.reason === "free";
  if (!listed.ok && !personal) return reject(listed.reason);
  const domain = listed.ok ? listed.domain : emailDomain(email)!;
  const skipMx = process.env.SDRCOACH_DEMO === "1" || process.env.SKIP_MX_CHECK === "1" || p.method === "google";
  if (!skipMx && !(await hasMx(domain))) return reject("no_mx");

  const db = createAdminClient();
  const ip = await clientIp();
  const limit = await checkDemoLimits(db, { email, domain, ip, personal });
  if (limit === "busy") {
    // Keep the lead, skip the call. The row counts against nothing since it never connects.
    await db.from("demo_calls").insert({ email, domain, ip, company, personal_email: personal, newsletter: Boolean(p.newsletter), status: "failed", error: "daily cap" });
    await logFunnel("karen_rejected", { email, reason: "busy", meta: { method: p.method } });
    return { waitlisted: true };
  }
  if (limit) return reject(limit);

  const click = await readAdClick();
  const { data: demo, error } = await db
    .from("demo_calls")
    .insert({ email, domain, ip, company, personal_email: personal, newsletter: Boolean(p.newsletter), share_slug: newShareSlug(), ...click })
    .select("id")
    .single();
  if (error || !demo) return reject("insert_failed");

  await track("demo_started", { domain, personal, method: p.method }).catch(() => {});
  return { id: demo.id };
}

export const DEMO_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 3 * 60 * 60 };
