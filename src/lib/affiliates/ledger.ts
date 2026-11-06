import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, emailConfigured } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { reportError } from "@/lib/sentry";

type Db = ReturnType<typeof createAdminClient>;

/**
 * Writes a paid invoice to the ledger. The first payment from a workspace an affiliate brought is the moment they
 * have been waiting for, so they hear about it, with no names.
 */
export async function recordPayment(db: Db, p: { id: string; orgId: string; amountCents: number; currency: "usd" | "eur"; paidAt: string }) {
  const { count: before } = await db.from("payments").select("id", { count: "exact", head: true }).eq("org_id", p.orgId);
  const { error } = await db.from("payments").upsert({ id: p.id, org_id: p.orgId, amount_cents: p.amountCents, currency: p.currency, paid_at: p.paidAt }, { onConflict: "id" });
  if (error) throw new Error(error.message);
  if ((before ?? 0) > 0 || !emailConfigured()) return;
  const { data: org } = await db.from("organizations").select("affiliate_id").eq("id", p.orgId).maybeSingle();
  if (!org?.affiliate_id) return;
  const { data: affiliate } = await db.from("affiliates").select("name, email, status").eq("id", org.affiliate_id).maybeSingle();
  if (!affiliate || affiliate.status !== "active") return;
  await sendMail({ to: affiliate.email, ...templates.affiliateFirstPayment({ firstName: affiliate.name.split(/\s+/)[0] ?? "there" }) }).catch((err) => reportError(err, { where: "affiliate_first_payment_email", extra: { affiliate: org.affiliate_id } }));
}

/**
 * A credit note against an invoice we ledgered reduces what the team paid. Each note is its own event, deduplicated
 * upstream, so the amounts add up. A note for an invoice we never saw (a zero or pre-ledger one) is ignored.
 */
export async function recordCredit(db: Db, invoiceId: string, creditedCents: number) {
  const { data: row } = await db.from("payments").select("refunded_cents").eq("id", invoiceId).maybeSingle();
  if (!row) return;
  const { error } = await db.from("payments").update({ refunded_cents: row.refunded_cents + creditedCents }).eq("id", invoiceId);
  if (error) throw new Error(error.message);
}
