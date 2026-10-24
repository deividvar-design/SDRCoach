import { describe, expect, it } from "vitest";
import { greetingName, nextCadenceStep } from "./cadence";

const work = { personal: false };
const personal = { personal: true };

describe("nextCadenceStep", () => {
  it("waits until day one for the first email", () => {
    expect(nextCadenceStep({ ...work, sent: 0, ageDays: 0.5, daysSinceLast: null })).toBeNull();
    expect(nextCadenceStep({ ...work, sent: 0, ageDays: 0.9, daysSinceLast: null })).toBe(1);
  });
  it("walks the days in order for a work email", () => {
    expect(nextCadenceStep({ ...work, sent: 1, ageDays: 3.9, daysSinceLast: 3 })).toBe(2);
    expect(nextCadenceStep({ ...work, sent: 2, ageDays: 7.9, daysSinceLast: 4 })).toBe(3);
    expect(nextCadenceStep({ ...work, sent: 3, ageDays: 13.9, daysSinceLast: 6 })).toBe(4);
    expect(nextCadenceStep({ ...work, sent: 4, ageDays: 20, daysSinceLast: 6 })).toBeNull();
  });
  it("skips the concierge email for personal addresses", () => {
    expect(nextCadenceStep({ ...personal, sent: 2, ageDays: 9, daysSinceLast: 5 })).toBeNull();
    expect(nextCadenceStep({ ...personal, sent: 2, ageDays: 13.9, daysSinceLast: 10 })).toBe(4);
  });
  it("never sends two emails within two days, even after a missed run", () => {
    expect(nextCadenceStep({ ...work, sent: 1, ageDays: 5, daysSinceLast: 1 })).toBeNull();
  });
  it("leaves leads older than the window alone", () => {
    expect(nextCadenceStep({ ...work, sent: 0, ageDays: 22, daysSinceLast: null })).toBeNull();
  });
});

describe("greetingName", () => {
  it("prefers the display name", () => {
    expect(greetingName("Kai Johnson", "voudstock@gmail.com", true)).toBe("Kai");
  });
  it("uses a clean first name from a work address", () => {
    expect(greetingName(null, "dana.reed@northwind.com", false)).toBe("Dana");
  });
  it("does not guess names from personal addresses or messy local parts", () => {
    expect(greetingName(null, "voudstock@gmail.com", true)).toBeNull();
    expect(greetingName(null, "kyle4tnt@acme.com", false)).toBeNull();
    expect(greetingName(null, "sales@acme.com", false)).toBeNull();
  });
});
