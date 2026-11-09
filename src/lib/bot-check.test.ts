import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, looksLikeBot, looksRandomName } from "./bot-check";

describe("looksRandomName", () => {
  it("flags the strings the sign-up bot used", () => {
    for (const n of ["pdsJMSEGgEQOczszGvaqNQx", "PYPPVSXPWKVqhcwubtSM", "sZBmTrxZUjmommSCxoZf", "TxkCjxGYCUYdnjEyOu", "HCqqfEwBaHhbzBTfrdSegdVd", "HovCeObbHFjHDfPTX"]) {
      expect(looksRandomName(n), n).toBe(true);
    }
  });
  it("leaves real names alone", () => {
    for (const n of ["David Varan", "Sam", "Anne-Marie O'Neill", "McDonald", "Christopherson", "Wolfeschlegelsteinhausen", "Jean Luc", "", "José García"]) {
      expect(looksRandomName(n), n).toBe(false);
    }
  });
});

describe("looksLikeBot", () => {
  const form = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };
  it("catches a filled honeypot and a random name", () => {
    expect(looksLikeBot(form({ email: "a@b.com", [HONEYPOT_FIELD]: "x" }))).toBe("honeypot");
    expect(looksLikeBot(form({ email: "a@b.com", full_name: "pdsJMSEGgEQOczszGvaqNQx" }))).toBe("random_name");
  });
  it("lets an ordinary sign-up through", () => {
    expect(looksLikeBot(form({ email: "a@b.com", full_name: "Sam Rivera", [HONEYPOT_FIELD]: "" }))).toBeNull();
    expect(looksLikeBot(form({ email: "a@b.com" }))).toBeNull();
  });
});
