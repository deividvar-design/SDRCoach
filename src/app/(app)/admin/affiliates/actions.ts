"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: string } | { error: string };

/** Records a payout you have made, so the balance drops and nothing is paid twice. */
export async function recordPayout(affiliateId: string, formData: FormData): Promise<Result> {
  const parsed = z
    .object({ currency: z.enum(["usd", "eur"]), amount: z.coerce.number().positive().max(100000), period: z.string().trim().min(4).max(20), note: z.string().trim().max(200).optional() })
    .safeParse({ currency: formData.get("currency"), amount: formData.get("amount"), period: formData.get("period"), note: formData.get("note") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the amount" };
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("affiliate_payouts").insert({ affiliate_id: affiliateId, currency: parsed.data.currency, amount_cents: Math.round(parsed.data.amount * 100), period: parsed.data.period, paid_by: admin.email, note: parsed.data.note ?? null });
  if (error) return { error: error.message };
  await db.from("admin_actions").insert({ admin_email: admin.email, org_id: null, action: "affiliate_payout", payload: { affiliate: affiliateId, currency: parsed.data.currency, amount: parsed.data.amount, period: parsed.data.period } });
  revalidatePath("/admin/affiliates");
  return { ok: `Recorded ${parsed.data.amount} ${parsed.data.currency.toUpperCase()} for ${parsed.data.period}.` };
}

export async function setAffiliateStatus(affiliateId: string, status: "active" | "paused" | "closed"): Promise<Result> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("affiliates").update({ status }).eq("id", affiliateId);
  if (error) return { error: error.message };
  await db.from("admin_actions").insert({ admin_email: admin.email, org_id: null, action: "affiliate_status", payload: { affiliate: affiliateId, status } });
  revalidatePath("/admin/affiliates");
  return { ok: `Affiliate ${status}.` };
}
