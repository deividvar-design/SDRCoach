import "server-only";
import { resolveMx } from "node:dns/promises";
import freeDomains from "free-email-domains";
import disposableDomains from "disposable-email-domains";

const FREE = new Set<string>(freeDomains);
const DISPOSABLE = new Set<string>(disposableDomains);

export type EmailReason = "invalid" | "free" | "disposable" | "no_mx";

export type BusinessEmailResult = { ok: true; domain: string } | { ok: false; reason: EmailReason; message: string };

const MESSAGES: Record<EmailReason, string> = {
  invalid: "Enter a valid email address.",
  free: "Use your work email. Personal addresses like Gmail or Outlook can't start a trial.",
  disposable: "Temporary email addresses can't start a trial. Use your work email.",
  no_mx: "That domain can't receive email. Check the spelling.",
};

export function emailDomain(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/** Registrable-ish parent for subdomain lookups: mail.gmail.com -> gmail.com. */
function candidates(domain: string) {
  const parts = domain.split(".");
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
  return out;
}

/** Pure list checks. No network. */
export function classifyEmailDomain(email: string): BusinessEmailResult {
  const domain = emailDomain(email);
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { ok: false, reason: "invalid", message: MESSAGES.invalid };
  for (const c of candidates(domain)) {
    if (DISPOSABLE.has(c)) return { ok: false, reason: "disposable", message: MESSAGES.disposable };
    if (FREE.has(c)) return { ok: false, reason: "free", message: MESSAGES.free };
  }
  return { ok: true, domain };
}

export async function hasMx(domain: string, lookup: (d: string) => Promise<{ exchange: string }[]> = resolveMx) {
  try {
    const records = await lookup(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

/** Lists first, then DNS. Enforced in the signup action and again before a workspace is created. */
export async function validateBusinessEmail(email: string, lookup?: (d: string) => Promise<{ exchange: string }[]>): Promise<BusinessEmailResult> {
  const listed = classifyEmailDomain(email);
  if (!listed.ok) return listed;
  if (process.env.SDRCOACH_DEMO === "1" || process.env.SKIP_MX_CHECK === "1") return listed;
  if (!(await hasMx(listed.domain, lookup))) return { ok: false, reason: "no_mx", message: MESSAGES.no_mx };
  return listed;
}
