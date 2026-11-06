import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { affiliateLink, affiliateStatement } from "@/lib/affiliates/program";
import { money, previousQuarter, quarterOf } from "@/lib/affiliates/statements";
import { AFFILIATE } from "@/content/affiliates";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AffiliateRowActions } from "./row-actions";

export const metadata = { title: "Affiliates" };
export const dynamic = "force-dynamic";

const VARIANT = { active: "success", paused: "outline", closed: "destructive" } as const;

/**
 * Every affiliate, what they have brought in, and what they are owed. The statement shown is for the last complete
 * quarter, which is what the first-Monday email covers; the balance is as of now.
 */
export default async function AdminAffiliatesPage() {
  await requireAdmin();
  const db = createAdminClient();
  const now = new Date();
  const last = previousQuarter(now);
  const current = quarterOf(now);
  const { data: affiliates } = await db.from("affiliates").select("*").order("created_at", { ascending: false }).limit(500);
  const rows = await Promise.all(
    (affiliates ?? []).map(async (a) => ({ a, last: await affiliateStatement(db, a, last), toDate: await affiliateStatement(db, a, { from: current.from, until: new Date(now.getTime() + 1).toISOString() }) })),
  );
  const owed = rows.filter((r) => Object.keys(r.last.payable).length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal"
        title="Affiliates"
        description={`${AFFILIATE.sharePercent}% of net payments for ${AFFILIATE.earningMonths} months, counted ${AFFILIATE.guaranteeDays} days after each payment. Statements for ${last.label} went out on its first Monday; ${owed.length} ${owed.length === 1 ? "affiliate is" : "affiliates are"} over the $${AFFILIATE.minimumPayout} floor. Record each payout here once it is sent. Refund a referred team from its invoice in Stripe, not from the charge, so the credit note reaches the ledger.`}
        actions={<span className="flex gap-4"><Link href="/affiliates" className="text-sm underline underline-offset-4">Public page</Link><Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link></span>}
      />
      <section className="bg-card rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Who</TableHead>
              <TableHead>Brought in</TableHead>
              <TableHead>{last.label} statement</TableHead>
              <TableHead>Balance now</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ a, last: s, toDate }) => {
              const payable = (Object.entries(s.payable) as ["usd" | "eur", number][])[0] ?? null;
              return (
                <TableRow key={a.id} className="align-top">
                  <TableCell className="max-w-sm whitespace-normal">
                    <div className="font-medium">{a.name} <Badge variant={VARIANT[a.status]} className="ml-1">{a.status}</Badge></div>
                    <div className="text-muted-foreground text-xs">{a.email}{a.channel ? ` · ${a.channel}` : ""}</div>
                    <div className="text-xs"><a href={affiliateLink(a.code)} className="underline underline-offset-4">{affiliateLink(a.code).replace(/^https?:\/\//, "")}</a></div>
                    <div className="text-muted-foreground mt-1 text-xs">{a.payout_method === "paypal" ? "PayPal" : "Bank"}: {a.payout_details}</div>
                    <div className="text-muted-foreground text-xs">joined {formatDate(a.created_at)}</div>
                  </TableCell>
                  <TableCell className="text-sm">{toDate.workspaces} {toDate.workspaces === 1 ? "workspace" : "workspaces"}</TableCell>
                  <TableCell className="text-sm whitespace-normal">
                    {(["usd", "eur"] as const).map((c) => {
                      const earned = s.periodEarnings.filter((e) => e.currency === c).reduce((sum, e) => sum + e.commissionCents, 0);
                      if (!earned && !s.balanceCents[c]) return null;
                      return <div key={c}>{money(earned, c)} earned · {money(s.balanceCents[c], c)} balance{s.payable[c] ? <span className="text-success"> · payable</span> : <span className="text-muted-foreground"> · carries over</span>}</div>;
                    })}
                    {!s.periodEarnings.length && !s.balanceCents.usd && !s.balanceCents.eur && <span className="text-muted-foreground">Nothing yet</span>}
                  </TableCell>
                  <TableCell className="text-sm whitespace-normal">
                    {(["usd", "eur"] as const).map((c) => (toDate.balanceCents[c] ? <div key={c}>{money(toDate.balanceCents[c], c)}</div> : null))}
                    {!toDate.balanceCents.usd && !toDate.balanceCents.eur && <span className="text-muted-foreground">—</span>}
                    {(toDate.paidCents.usd > 0 || toDate.paidCents.eur > 0) && <div className="text-muted-foreground text-xs">paid out {[toDate.paidCents.usd ? money(toDate.paidCents.usd, "usd") : null, toDate.paidCents.eur ? money(toDate.paidCents.eur, "eur") : null].filter(Boolean).join(", ")}</div>}
                  </TableCell>
                  <TableCell className="text-right"><AffiliateRowActions id={a.id} status={a.status} period={last.label} suggested={payable ? { currency: payable[0], amount: payable[1] } : null} /></TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">No affiliates yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
