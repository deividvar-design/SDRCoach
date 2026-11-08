import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { demoCookieValue, demoIdFromCookie } = await import("./session");

const ID = "3f2c8a1e-4b5d-4e6f-9a7b-1c2d3e4f5a6b";

describe("Karen demo cookie", () => {
  it("round-trips a signed id", () => {
    expect(demoIdFromCookie(demoCookieValue(ID))).toBe(ID);
  });
  it("refuses the bare id that appears in the scorecard email", () => {
    expect(demoIdFromCookie(ID)).toBeNull();
  });
  it("refuses a signature from another id, a tampered one, and junk", () => {
    const other = demoCookieValue("00000000-0000-4000-8000-000000000000").split(".")[1];
    expect(demoIdFromCookie(`${ID}.${other}`)).toBeNull();
    const sig = demoCookieValue(ID).split(".")[1]!;
    expect(demoIdFromCookie(`${ID}.${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`)).toBeNull();
    expect(demoIdFromCookie(`${ID}.`)).toBeNull();
    expect(demoIdFromCookie(undefined)).toBeNull();
    expect(demoIdFromCookie("not-a-uuid.abc")).toBeNull();
  });
});
