import { describe, expect, it } from "vitest";
import { leaderboard, levelProgress, streakDays, suggestedLevel, type SessionLite } from "./progress";

const now = new Date("2026-09-26T12:00:00Z");
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
const s = (daysAgo: number, overall: number | null, difficulty: SessionLite["difficulty"] = "warm", user = "u1"): SessionLite => ({
  user_id: user,
  created_at: at(daysAgo),
  difficulty,
  outcome: overall && overall > 7 ? "meeting_booked" : "rejected",
  overall,
});

describe("streakDays", () => {
  it("counts consecutive days including today", () => {
    expect(streakDays([s(0, 7), s(1, 6), s(2, 5)], now)).toBe(3);
  });
  it("still counts when today has no call yet", () => {
    expect(streakDays([s(1, 6), s(2, 5)], now)).toBe(2);
  });
  it("breaks on a gap", () => {
    expect(streakDays([s(0, 7), s(2, 5)], now)).toBe(1);
  });
  it("is zero with nothing recent", () => {
    expect(streakDays([s(5, 7)], now)).toBe(0);
  });
});

describe("levelProgress / suggestedLevel", () => {
  it("recommends the next level after three good calls", () => {
    const list = [s(0, 8), s(1, 7.5), s(2, 7)];
    expect(levelProgress(list)[0]!.ready).toBe(true);
    expect(suggestedLevel(list)).toBe("inbound");
  });
  it("does not recommend on two calls or a low average", () => {
    expect(suggestedLevel([s(0, 9), s(1, 9)])).toBe("warm");
    expect(suggestedLevel([s(0, 9), s(1, 5), s(2, 5)])).toBe("warm");
  });
  it("chains through levels", () => {
    const list = [s(0, 8, "inbound"), s(1, 8, "inbound"), s(2, 8, "inbound"), s(3, 8), s(4, 8), s(5, 8)];
    expect(suggestedLevel(list)).toBe("cold");
  });
});

describe("boss fights", () => {
  it("count for streaks but never for scores or the board", () => {
    const boss: SessionLite = { ...s(0, 10), boss: true };
    const list = [boss, s(1, 6), s(2, 6), s(3, 6)];
    expect(streakDays(list, now)).toBe(4);
    expect(levelProgress(list)[0]!.calls).toBe(3);
    expect(leaderboard(list, new Map([["u1", "Ana"]]), 7, now)[0]).toMatchObject({ calls: 3, best: 6 });
  });
});

describe("leaderboard", () => {
  it("ranks by calls made within the window and ignores old calls", () => {
    const names = new Map([["u1", "A"], ["u2", "B"]]);
    const rows = leaderboard([s(0, 6), s(1, 7), s(2, 5, "warm", "u2"), s(20, 10)], names, 7, now);
    expect(rows.map((r) => r.name)).toEqual(["A", "B"]);
    expect(rows[0]!.calls).toBe(2);
  });

  it("shows an average only after three reviewed calls", () => {
    const names = new Map([["u1", "A"], ["u2", "B"]]);
    const rows = leaderboard([s(0, 9), s(1, 8), s(2, 7), s(0, 10, "warm", "u2")], names, 7, now);
    expect(rows[0]!.avg).toBeCloseTo(8, 1);
    expect(rows[1]!.avg).toBeNull();
    expect(rows[1]!.reviewed).toBe(1);
  });
});
