import { describe, expect, it } from "vitest";
import { moodById, rollMood, seededRandom, SETTINGS, TEMPERS } from "./moods";

describe("call moods", () => {
  it("rolls a place and a temperament, and the id brings the same mood back", () => {
    const mood = rollMood("inbound", seededRandom("call-1"));
    expect(mood.id).toMatch(/^[a-z_]+:[a-z_]+$/);
    expect(moodById(mood.id)).toEqual(mood);
  });

  it("gives the same roll for the same seed, so the free Karen call scores against what she was told", () => {
    expect(rollMood("cold", seededRandom("demo-abc"))).toEqual(rollMood("cold", seededRandom("demo-abc")));
  });

  it("reaches every place and every temperament over many calls", () => {
    const rand = seededRandom("spread");
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) for (const level of ["warm", "inbound", "cold"] as const) seen.add(rollMood(level, rand).id);
    for (const s of SETTINGS) expect([...seen].some((id) => id.startsWith(`${s.id}:`))).toBe(true);
    for (const t of TEMPERS) expect([...seen].some((id) => id.endsWith(`:${t.id}`))).toBe(true);
  });

  it("never rolls a chatty prospect at Level 3, where boss fights roll", () => {
    const rand = seededRandom("boss");
    for (let i = 0; i < 500; i++) expect(rollMood("cold", rand).id.endsWith(":chatty")).toBe(false);
  });

  it("still labels calls made before places and temperaments were split", () => {
    expect(moodById("car")?.label).toBe("In the car");
    expect(moodById("meeting")?.label).toBe("Between meetings");
    expect(moodById("nonsense")).toBeNull();
  });
});
