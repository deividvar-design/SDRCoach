import { describe, expect, it } from "vitest";
import { authMethod, cleanObjection, cleanSourcePath } from "./source";

describe("cleanSourcePath", () => {
  it("keeps site paths and drops anything else", () => {
    expect(cleanSourcePath("/objections")).toBe("/objections");
    expect(cleanSourcePath("/blog/cold-call-roleplay")).toBe("/blog/cold-call-roleplay");
    expect(cleanSourcePath("/for-enablement?x=1")).toBe("/for-enablement?x=1");
    expect(cleanSourcePath("//evil.example")).toBeNull();
    expect(cleanSourcePath("https://evil.example/")).toBeNull();
    expect(cleanSourcePath("objections")).toBeNull();
    expect(cleanSourcePath("/a<script>")).toBeNull();
    expect(cleanSourcePath(null)).toBeNull();
    expect(cleanSourcePath(`/${"a".repeat(300)}`)).toBeNull();
  });
});

describe("cleanObjection", () => {
  it("accepts library slugs only", () => {
    expect(cleanObjection("send-me-an-email")).toBe("send-me-an-email");
    expect(cleanObjection("Send-Me-An-Email")).toBe("send-me-an-email");
    expect(cleanObjection("../x")).toBeNull();
    expect(cleanObjection("")).toBeNull();
    expect(cleanObjection(undefined)).toBeNull();
  });
});

describe("authMethod", () => {
  it("maps the call method to the event value", () => {
    expect(authMethod("google")).toBe("google");
    expect(authMethod("email")).toBe("email");
    expect(authMethod("call")).toBe("none");
    expect(authMethod("rematch")).toBe("none");
    expect(authMethod(null)).toBe("none");
  });
});
