import { describe, expect, it } from "vitest";
import { buildStatement, earningsFrom, isStatementDay, previousQuarter, quarterOf, statementLines } from "./statements";

const pay = (id: string, org: string, cents: number, paidAt: string, refunded = 0, currency: "usd" | "eur" = "usd") => ({ id, org_id: org, amount_cents: cents, refunded_cents: refunded, currency, paid_at: paidAt });

describe("earningsFrom", () => {
  it("takes a quarter of the net amount and counts it thirty days after payment", () => {
    const [e] = earningsFrom([pay("in_1", "org-a", 14700, "2026-11-10T00:00:00Z")]);
    expect(e).toMatchObject({ netCents: 14700, commissionCents: 3675, earnedAt: "2026-12-10T00:00:00.000Z" });
  });
  it("nets refunds and drops fully refunded invoices", () => {
    const es = earningsFrom([pay("in_1", "org-a", 10000, "2026-11-10T00:00:00Z", 4000), pay("in_2", "org-a", 10000, "2026-12-10T00:00:00Z", 10000)]);
    expect(es).toHaveLength(1);
    expect(es[0]).toMatchObject({ netCents: 6000, commissionCents: 1500 });
  });
  it("stops twelve months after the team's first payment", () => {
    const es = earningsFrom([pay("in_1", "org-a", 100, "2026-01-15T00:00:00Z"), pay("in_2", "org-a", 100, "2027-01-14T00:00:00Z"), pay("in_3", "org-a", 100, "2027-01-15T00:00:00Z")]);
    expect(es.map((e) => e.invoiceId)).toEqual(["in_1", "in_2"]);
  });
});

describe("buildStatement", () => {
  const q4 = { from: "2026-10-01T00:00:00Z", until: "2027-01-01T00:00:00Z" };
  it("only counts earnings whose guarantee window closed inside the period", () => {
    const es = earningsFrom([pay("in_1", "org-a", 40000, "2026-11-15T00:00:00Z"), pay("in_2", "org-a", 40000, "2026-12-15T00:00:00Z")]);
    const s = buildStatement(es, [], q4);
    // The December payment becomes non-refundable in January, so it waits for the next statement.
    expect(s.periodEarnings.map((e) => e.invoiceId)).toEqual(["in_1"]);
    expect(s.earnedCents.usd).toBe(10000);
    expect(s.payable).toEqual({ usd: 10000 });
  });
  it("carries a balance under the floor and subtracts what was already paid", () => {
    const es = earningsFrom([pay("in_1", "org-a", 20000, "2026-10-15T00:00:00Z")]);
    expect(buildStatement(es, [], q4).payable).toEqual({});
    const later = earningsFrom([pay("in_1", "org-a", 20000, "2026-10-15T00:00:00Z"), pay("in_2", "org-a", 30000, "2027-01-15T00:00:00Z")]);
    const q1 = { from: "2027-01-01T00:00:00Z", until: "2027-04-01T00:00:00Z" };
    const s = buildStatement(later, [{ currency: "usd", amount_cents: 2000 }], q1);
    expect(s.balanceCents.usd).toBe(5000 + 7500 - 2000);
    expect(s.payable).toEqual({ usd: 10500 });
  });
  it("keeps currencies apart", () => {
    const es = earningsFrom([pay("in_1", "org-a", 40000, "2026-10-15T00:00:00Z", 0, "eur"), pay("in_2", "org-b", 40000, "2026-10-15T00:00:00Z")]);
    const s = buildStatement(es, [], q4);
    expect(s.payable).toEqual({ usd: 10000, eur: 10000 });
    expect(statementLines(s)[0]).toContain("USD: earned this quarter $100.00 from 2 teams");
  });
});

describe("quarters", () => {
  it("names the quarter and its bounds", () => {
    expect(quarterOf(new Date("2026-11-06T12:00:00Z"))).toEqual({ label: "Q4 2026", from: "2026-10-01T00:00:00.000Z", until: "2027-01-01T00:00:00.000Z" });
    expect(previousQuarter(new Date("2027-01-04T09:00:00Z")).label).toBe("Q4 2026");
  });
  it("knows the first Monday of a quarter", () => {
    expect(isStatementDay(new Date("2027-01-04T09:00:00Z"))).toBe(true);
    expect(isStatementDay(new Date("2027-01-11T09:00:00Z"))).toBe(false);
    expect(isStatementDay(new Date("2027-02-01T09:00:00Z"))).toBe(false);
    expect(isStatementDay(new Date("2027-04-05T09:00:00Z"))).toBe(true);
  });
});
