import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { classifyEmailDomain, emailDomain, hasMx, validateBusinessEmail } = await import("./business");

describe("classifyEmailDomain", () => {
  it("rejects consumer providers", () => {
    for (const e of ["a@gmail.com", "b@hotmail.com", "c@yahoo.co.uk", "d@outlook.com", "e@icloud.com", "f@proton.me", "g@gmx.de"]) {
      expect(classifyEmailDomain(e)).toMatchObject({ ok: false, reason: "free" });
    }
  });
  it("rejects disposable providers", () => {
    expect(classifyEmailDomain("x@mailinator.com")).toMatchObject({ ok: false, reason: "disposable" });
  });
  it("rejects malformed addresses", () => {
    expect(classifyEmailDomain("nope")).toMatchObject({ ok: false, reason: "invalid" });
    expect(classifyEmailDomain("a@localhost")).toMatchObject({ ok: false, reason: "invalid" });
  });
  it("accepts business domains, case-insensitively, including subdomains", () => {
    expect(classifyEmailDomain("Dana@Northwind-Freight.com")).toEqual({ ok: true, domain: "northwind-freight.com" });
    expect(classifyEmailDomain("ops@eu.acme.io")).toEqual({ ok: true, domain: "eu.acme.io" });
  });
  it("catches subdomains of consumer providers", () => {
    expect(classifyEmailDomain("a@mail.gmail.com")).toMatchObject({ ok: false, reason: "free" });
  });
  it("extracts domains", () => {
    expect(emailDomain("A@B.CO")).toBe("b.co");
    expect(emailDomain("nope")).toBeNull();
  });
});

describe("validateBusinessEmail", () => {
  it("fails closed when DNS has no MX", async () => {
    const r = await validateBusinessEmail("a@nomx-example.com", async () => []);
    expect(r).toMatchObject({ ok: false, reason: "no_mx" });
  });
  it("passes with MX", async () => {
    const r = await validateBusinessEmail("a@acme.com", async () => [{ exchange: "mx.acme.com" }]);
    expect(r).toEqual({ ok: true, domain: "acme.com" });
  });
  it("hasMx swallows resolver errors", async () => {
    expect(await hasMx("x", async () => { throw new Error("ENOTFOUND"); })).toBe(false);
  });
});
