import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { referralLink } from "@/lib/rewards/referral";
import type { Affiliate } from "@/types/database";
import { buildStatement, earningsFrom, type Statement } from "./statements";

type Db = ReturnType<typeof createAdminClient>;

export function affiliateLink(code: string) {
  return referralLink(code);
}

/** Everything an affiliate has brought in, and where they stand as of the period given. */
export async function affiliateStatement(db: Db, affiliate: Pick<Affiliate, "id">, period: { from: string; until: string }): Promise<Statement & { workspaces: number }> {
  const { data: orgs } = await db.from("organizations").select("id").eq("affiliate_id", affiliate.id);
  const ids = (orgs ?? []).map((o) => o.id);
  const [{ data: payments }, { data: payouts }] = await Promise.all([
    ids.length ? db.from("payments").select("id, org_id, amount_cents, refunded_cents, currency, paid_at").in("org_id", ids) : Promise.resolve({ data: [] }),
    db.from("affiliate_payouts").select("currency, amount_cents").eq("affiliate_id", affiliate.id),
  ]);
  return { ...buildStatement(earningsFrom(payments ?? []), payouts ?? [], period), workspaces: ids.length };
}
