import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { noLongDashes, withoutLongDashes } from "./dashes";

const LONG = /[\u2013\u2014]/;
const ROOTS = ["src", "content", "public"];
const TEXT = /\.(tsx?|mdx?|txt|json|css|html|xml)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : TEXT.test(name) ? [p] : [];
  });
}

describe("long dashes", () => {
  it("never appear in the site's own copy or code", () => {
    const hits = ROOTS.flatMap((root) => walk(root)).flatMap((file) =>
      readFileSync(file, "utf8").split("\n").flatMap((line, i) => (LONG.test(line) ? [`${file}:${i + 1}: ${line.trim().slice(0, 120)}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it("are cleaned out of model output", () => {
    expect(noLongDashes("Good opener \u2014 then you lost her")).toBe("Good opener, then you lost her");
    expect(noLongDashes("200\u2013500 employees")).toBe("200 to 500 employees");
    expect(noLongDashes("$40\u2013$80")).toBe("$40 to $80");
    expect(withoutLongDashes({ a: ["x\u2013y"], b: 3 })).toEqual({ a: ["x, y"], b: 3 });
  });
});
