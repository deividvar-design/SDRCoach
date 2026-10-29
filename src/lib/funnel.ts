import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailDomain } from "@/lib/email/business";
import { reportError } from "@/lib/sentry";

export type FunnelKind =
  | "karen_submit"
  | "karen_rejected"
  | "karen_email"
  | "site_fetch_failed"
  | "karen_call_started"
  | "karen_call_completed"
  | "signup_submit"
  | "signup_rejected"
  | "signup_completed"
  | "first_call"
  | "trial_to_paid";

/**
 * One row per form outcome. The address itself is never written: its domain for segmenting and a hash for joining
 * the same person across steps. A dedupe key makes milestone events idempotent. Never throws; a failed log is
 * reported and the user's request carries on.
 */
export async function logFunnel(kind: FunnelKind, p: { email?: string | null; reason?: string | null; subject?: string | null; dedupeKey?: string | null; meta?: Record<string, unknown> } = {}) {
  if (process.env.SDRCOACH_DEMO === "1") return;
  try {
    const email = p.email?.trim().toLowerCase() || null;
    const { error } = await createAdminClient()
      .from("funnel_events")
      .insert({
        kind,
        reason: p.reason ?? null,
        email_domain: email ? emailDomain(email) : null,
        email_hash: email ? createHash("sha256").update(email).digest("hex") : null,
        subject: p.subject ?? null,
        dedupe_key: p.dedupeKey ?? null,
        meta: p.meta ?? {},
      });
    // 23505: the dedupe key already exists, which is the point of it.
    if (error && error.code !== "23505") reportError(new Error(error.message), { where: "funnel_log", extra: { kind } });
  } catch (err) {
    reportError(err, { where: "funnel_log", extra: { kind } });
  }
}
