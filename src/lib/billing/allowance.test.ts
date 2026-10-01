import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { periodWindow } from "./allowance";

describe("periodWindow", () => {
  const end = "2027-03-15T10:00:00.000Z";

  it("is the whole period on a monthly plan", () => {
    const now = Date.parse("2027-03-01T00:00:00Z");
    const w = periodWindow({ billing_interval: "month", current_period_end: end }, now)!;
    expect(w.start.toISOString()).toBe("2027-02-15T10:00:00.000Z");
    expect(w.end.toISOString()).toBe(end);
    expect(w.months).toBe(1);
  });

  it("steps back a month at a time on an annual plan so the allowance resets monthly", () => {
    const now = Date.parse("2026-07-20T00:00:00Z");
    const w = periodWindow({ billing_interval: "year", current_period_end: end }, now)!;
    expect(w.start.toISOString()).toBe("2026-07-15T10:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-08-15T10:00:00.000Z");
  });

  it("returns null without a period end", () => {
    expect(periodWindow({ billing_interval: "month", current_period_end: null })).toBeNull();
  });
});
