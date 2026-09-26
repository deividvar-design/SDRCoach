import { describe, expect, it } from "vitest";
import { csvToTranscriptText, fileToText, parseCsv } from "./parse";

describe("parseCsv", () => {
  it("handles quoted commas, escaped quotes and CRLF", () => {
    const rows = parseCsv('a,b\r\n"hello, world","she said ""hi"""\r\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["hello, world", 'she said "hi"'],
    ]);
  });
  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toHaveLength(2);
  });
});

describe("csvToTranscriptText", () => {
  it("renders utterance-per-row exports with speaker labels and call breaks", () => {
    const csv = ["call_id,speaker,text", "c1,Rep,Hi Dana", "c1,Prospect,Who is this?", "c2,Rep,Hello again"].join("\n");
    const out = csvToTranscriptText(csv);
    expect(out).toContain("--- Call 1 ---");
    expect(out).toContain("Rep: Hi Dana");
    expect(out).toContain("Prospect: Who is this?");
    expect(out).toContain("--- Call 2 ---");
  });
  it("renders transcript-per-row exports", () => {
    const csv = 'id,transcript\n1,"Rep: hi\nProspect: no thanks, we are fine"\n2,"Rep: hello there and more words"';
    const out = csvToTranscriptText(csv);
    expect(out.split("--- Call").length - 1).toBe(2);
    expect(out).toContain("Prospect: no thanks, we are fine");
  });
  it("falls back to joining cells for unknown shapes", () => {
    expect(csvToTranscriptText("x,y\n1,2")).toBe("1 | 2");
  });
  it("passes plain text through", () => {
    expect(fileToText("notes.txt", "hello")).toBe("hello");
  });
});
