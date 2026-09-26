import { describe, expect, it } from "vitest";
import { trialStatus } from "./trial";

const now = new Date("2026-09-26T12:00:00Z");
const org = (over: Partial<{ plan: string; trial_call_limit: number; trial_ends_at: string }> = {}) => ({
  plan: "trial",
  trial_call_limit: 10,
  trial_ends_at: "2026-10-05T12:00:00Z",
  ...over,
});

describe("trialStatus", () => {
  it("is unlimited on a paid plan", () => {
    expect(trialStatus(org({ plan: "team" }), 500, now).exhausted).toBe(false);
  });
  it("counts calls left and days left", () => {
    const s = trialStatus(org(), 7, now);
    expect(s).toMatchObject({ onTrial: true, callsLeft: 3, daysLeft: 9, exhausted: false });
  });
  it("exhausts on calls", () => {
    expect(trialStatus(org(), 10, now)).toMatchObject({ exhausted: true, reason: "calls" });
  });
  it("exhausts on time", () => {
    expect(trialStatus(org({ trial_ends_at: "2026-09-20T00:00:00Z" }), 1, now)).toMatchObject({ exhausted: true, reason: "time" });
  });
});
