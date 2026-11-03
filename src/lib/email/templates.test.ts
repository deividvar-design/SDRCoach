import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { templates } = await import("./templates");
const { absoluteUrl } = await import("@/lib/site");

const dims = Object.fromEntries(["opener", "reason_for_call", "discovery", "objection_handling", "value_prop", "close"].map((k) => [k, { score: 6, rationale: `${k} note` }])) as Parameters<typeof templates.demoScorecard>[0]["dimensions"];

describe("demoScorecard", () => {
  const base = { firstName: "Sam", email: "sam@example.com", overall: 6.6, outcome: "hung_up", outcomeReason: "Enough.", dimensions: dims, strengths: ["a"], improvements: ["b"], coachSummary: "c", unsubscribeUrl: "https://100dials.com/u" };
  it("hands off to the team trial with the email prefilled and names the objection page", () => {
    const m = templates.demoScorecard({ ...base, cameFrom: { text: "Just send me an email.", url: "https://100dials.com/objections/send-me-an-email" } });
    expect(m.html).toContain("Start the team trial");
    expect(m.html).toContain(`href="${absoluteUrl("/signup?email=sam%40example.com")}"`);
    expect(m.html).toContain("Your team's reps face these same objections.");
    expect(m.html).toContain("You came from: ‘Just send me an email.’");
    expect(m.html).toContain('href="https://100dials.com/objections/send-me-an-email"');
    expect(m.text).toContain("Read how to handle it: https://100dials.com/objections/send-me-an-email");
  });
  it("sends a personal address to a plain signup and skips the objection line when there is none", () => {
    const m = templates.demoScorecard({ ...base, email: "sam@gmail.com", personalEmail: true });
    expect(m.html).toContain(`href="${absoluteUrl("/signup")}"`);
    expect(m.html).not.toContain("signup?email=");
    expect(m.html).not.toContain("You came from");
  });
});
