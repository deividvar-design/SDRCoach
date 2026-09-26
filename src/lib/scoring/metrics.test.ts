import { describe, expect, it } from "vitest";
import { computeMetrics } from "./metrics";

const turns = [
  { role: "prospect" as const, text: "Yeah?", t_start_ms: 0 },
  { role: "rep" as const, text: "Hi, it's Sam from Acme. Um, the reason I'm calling is your fleet grew. Fair to take thirty seconds?", t_start_ms: 2000 },
  { role: "prospect" as const, text: "We already have a vendor. Send me an email.", t_start_ms: 12000, interrupted: true },
  { role: "rep" as const, text: "Understood. What are you using it for today?", t_start_ms: 16000 },
  { role: "prospect" as const, text: "Cameras mostly.", t_start_ms: 20000 },
];

describe("computeMetrics", () => {
  const m = computeMetrics(turns, 25);
  it("counts turns and questions", () => {
    expect(m.rep_turns).toBe(2);
    expect(m.prospect_turns).toBe(3);
    expect(m.rep_questions).toBe(2);
  });
  it("finds the first objection", () => {
    expect(m.first_objection_secs).toBe(12);
  });
  it("counts fillers and interruptions", () => {
    expect(m.filler_words).toBe(1);
    expect(m.interruptions_by_rep).toBe(1);
  });
  it("keeps talk ratio in range", () => {
    expect(m.rep_talk_ratio).toBeGreaterThan(0);
    expect(m.rep_talk_ratio).toBeLessThan(1);
  });
  it("handles an empty call", () => {
    const e = computeMetrics([], 0);
    expect(e.rep_talk_ratio).toBe(0);
    expect(e.first_objection_secs).toBeNull();
  });
});
