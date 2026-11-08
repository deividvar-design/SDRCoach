import "server-only";
import { Resend } from "resend";
import { SITE } from "@/lib/site";

let client: Resend | null = null;

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** A display name in front of our address, for mail sent on someone's behalf. The address never changes. */
  fromName?: string;
}

/** Sends through Resend. Without a key it logs the subject and returns, so local flows never break. */
export async function sendMail(mail: Mail): Promise<{ id: string | null; skipped: boolean }> {
  if (!emailConfigured()) {
    console.info(`[email skipped] to=${mail.to} subject="${mail.subject}"`);
    return { id: null, skipped: true };
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  const base = process.env.EMAIL_FROM ?? `${SITE.name} <hello@${new URL(SITE.url).hostname}>`;
  const address = base.match(/<([^>]+)>/)?.[1] ?? base;
  // A person's name only: letters, spaces and name punctuation, so it cannot pose as a brand or a security team.
  const name = mail.fromName?.replace(/[^\p{L}\p{M} .'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60) ?? "";
  const from = name ? `${name} via ${SITE.name} <${address}>` : base;
  const { data, error } = await client.emails.send({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: mail.replyTo ?? SITE.company.email });
  if (error) throw new Error(error.message);
  return { id: data?.id ?? null, skipped: false };
}
