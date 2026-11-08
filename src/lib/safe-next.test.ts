import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/sessions/abc?fresh=1")).toBe("/sessions/abc?fresh=1");
  });
  it("rejects protocol-relative and backslash tricks", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
  it("rejects paths that normalise into another origin", () => {
    for (const trick of ["/.//evil.com", "/..//evil.com", "/%2e//evil.com", "/./\\evil.com", "/a/..//evil.com"]) expect(safeNext(trick)).toBe("/dashboard");
  });
  it("rejects script and data URLs", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("data:text/html,x")).toBe("/dashboard");
  });
});
