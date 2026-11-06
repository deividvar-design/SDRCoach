import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { pilotCalls, pilotSeats, PARTNER } from "@/content/founding-partners";
import { partnerReport, reportSummary } from "./program";

describe("pilot allowance", () => {
  it("gives forty calls per rep, capped at five reps", () => {
    expect(pilotCalls(3)).toBe(120);
    expect(pilotCalls(5)).toBe(200);
    expect(pilotCalls(40)).toBe(PARTNER.maxReps * PARTNER.callsPerRep);
  });
  it("seats the pilot reps plus the manager", () => {
    expect(pilotSeats(3)).toBe(4);
    expect(pilotSeats(12)).toBe(6);
  });
});

describe("report summary", () => {
  const base = { calls: 36, reps: 3, callsPerRep: 12, firstWeekAvg: 4.1, lastWeekAvg: 6.3, objectionFirst: 3.2, objectionLast: 5.9, firstWeekCalls: 9, lastWeekCalls: 8, computedAt: "2026-12-06T00:00:00Z" };
  it("states the numbers in plain sentences", () => {
    expect(reportSummary(base)).toEqual([
      "36 scored calls from 3 reps, 12 per rep.",
      "Average score: 4.1 out of 10 in the first week, 6.3 in the last week.",
      "Objection handling: 3.2 in the first week, 5.9 in the last.",
    ]);
  });
  it("leaves out comparisons it cannot make instead of guessing", () => {
    const lines = reportSummary({ ...base, lastWeekAvg: null, objectionLast: null });
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Too few calls in the last week");
  });
  it("reads a stored report and rejects anything else", () => {
    expect(partnerReport({ report: base })).toEqual(base);
    expect(partnerReport({ report: null })).toBeNull();
    expect(partnerReport({ report: ["x"] })).toBeNull();
  });
});
