import { AFFILIATE } from "@/content/affiliates";
import type { AffiliatePayout, Payment } from "@/types/database";

export type Currency = "usd" | "eur";
const DAY = 86_400_000;

export interface Earning {
  orgId: string;
  invoiceId: string;
  currency: Currency;
  /** Net amount the team paid, in cents. */
  netCents: number;
  /** The affiliate's share of it, in cents. */
  commissionCents: number;
  /** When the payment became non-refundable and so started counting. */
  earnedAt: string;
}

export interface Statement {
  /** Everything earned up to the statement date, by currency. */
  earnedCents: Record<Currency, number>;
  paidCents: Record<Currency, number>;
  balanceCents: Record<Currency, number>;
  /** Earnings whose non-refundable date fell inside the period. */
  periodEarnings: Earning[];
  payable: Partial<Record<Currency, number>>;
}

const zero = (): Record<Currency, number> => ({ usd: 0, eur: 0 });

/**
 * Which payments earn commission, and how much: net of refunds, only once the money-back window has closed, and
 * only within the earning months after the team's first payment. Pure, so the statement can be tested on paper.
 */
export function earningsFrom(payments: Pick<Payment, "id" | "org_id" | "amount_cents" | "refunded_cents" | "currency" | "paid_at">[]): Earning[] {
  const firstPaid = new Map<string, number>();
  for (const p of payments) {
    const t = new Date(p.paid_at).getTime();
    firstPaid.set(p.org_id, Math.min(firstPaid.get(p.org_id) ?? Infinity, t));
  }
  const out: Earning[] = [];
  for (const p of payments) {
    const paidAt = new Date(p.paid_at).getTime();
    const first = firstPaid.get(p.org_id)!;
    const cutoff = new Date(first);
    cutoff.setUTCMonth(cutoff.getUTCMonth() + AFFILIATE.earningMonths);
    if (paidAt >= cutoff.getTime()) continue;
    const net = Math.max(0, p.amount_cents - p.refunded_cents);
    if (net === 0) continue;
    out.push({
      orgId: p.org_id,
      invoiceId: p.id,
      currency: p.currency,
      netCents: net,
      commissionCents: Math.round((net * AFFILIATE.sharePercent) / 100),
      earnedAt: new Date(paidAt + AFFILIATE.guaranteeDays * DAY).toISOString(),
    });
  }
  return out;
}

/** The statement as of `until`, for the quarter ending then: what is owed in total and what crossed the floor. */
export function buildStatement(earnings: Earning[], payouts: Pick<AffiliatePayout, "currency" | "amount_cents">[], period: { from: string; until: string }): Statement {
  const untilT = new Date(period.until).getTime();
  const fromT = new Date(period.from).getTime();
  const earnedCents = zero();
  const periodEarnings: Earning[] = [];
  for (const e of earnings) {
    const t = new Date(e.earnedAt).getTime();
    if (t >= untilT) continue;
    earnedCents[e.currency] += e.commissionCents;
    if (t >= fromT) periodEarnings.push(e);
  }
  const paidCents = zero();
  for (const p of payouts) paidCents[p.currency] += p.amount_cents;
  const balanceCents = zero();
  const payable: Partial<Record<Currency, number>> = {};
  for (const c of ["usd", "eur"] as const) {
    balanceCents[c] = Math.max(0, earnedCents[c] - paidCents[c]);
    if (balanceCents[c] >= AFFILIATE.minimumPayout * 100) payable[c] = balanceCents[c];
  }
  return { earnedCents, paidCents, balanceCents, periodEarnings, payable };
}

/** The quarter a date falls in, as "Q4 2026", with its bounds. */
export function quarterOf(date: Date) {
  const q = Math.floor(date.getUTCMonth() / 3);
  const from = new Date(Date.UTC(date.getUTCFullYear(), q * 3, 1));
  const until = new Date(Date.UTC(date.getUTCFullYear(), q * 3 + 3, 1));
  return { label: `Q${q + 1} ${date.getUTCFullYear()}`, from: from.toISOString(), until: until.toISOString() };
}

/** The quarter before the one `date` is in: what a statement issued on the first Monday covers. */
export function previousQuarter(date: Date) {
  const q = Math.floor(date.getUTCMonth() / 3);
  const start = new Date(Date.UTC(date.getUTCFullYear(), q * 3 - 3, 1));
  return quarterOf(start);
}

/** The first Monday of January, April, July or October. */
export function isStatementDay(date: Date) {
  return date.getUTCMonth() % 3 === 0 && date.getUTCDay() === 1 && date.getUTCDate() <= 7;
}

export function money(cents: number, currency: Currency) {
  return `${currency === "usd" ? "$" : "€"}${(cents / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Plain lines for the statement email. */
export function statementLines(s: Statement): string[] {
  const lines: string[] = [];
  const teams = new Set(s.periodEarnings.map((e) => e.orgId)).size;
  const periodByCurrency = zero();
  for (const e of s.periodEarnings) periodByCurrency[e.currency] += e.commissionCents;
  for (const c of ["usd", "eur"] as const) {
    if (s.earnedCents[c] === 0 && s.paidCents[c] === 0) continue;
    lines.push(`${c.toUpperCase()}: earned this quarter ${money(periodByCurrency[c], c)} from ${teams} ${teams === 1 ? "team" : "teams"}; carried over ${money(Math.max(0, s.earnedCents[c] - periodByCurrency[c] - s.paidCents[c]), c)}; balance ${money(s.balanceCents[c], c)}.`);
  }
  if (lines.length === 0) lines.push("Nothing earned yet. Your link is still live and the cookie lasts ninety days.");
  return lines;
}
