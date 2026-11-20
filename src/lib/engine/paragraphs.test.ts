import { describe, expect, it } from "vitest";
import { splitParagraphs } from "./paragraphs";

describe("splitParagraphs", () => {
  it("splits on a blank line with correct offsets", () => {
    const paras = splitParagraphs("a\n\nb");
    expect(paras).toEqual([
      { start: 0, end: 1, text: "a" },
      { start: 3, end: 4, text: "b" },
    ]);
  });

  it("handles 3 blank lines in a row", () => {
    const paras = splitParagraphs("a\n\n\n\nb");
    expect(paras.map((p) => p.text)).toEqual(["a", "b"]);
    expect(paras[1]).toEqual({ start: 5, end: 6, text: "b" });
  });

  it("skips leading and trailing whitespace runs", () => {
    const paras = splitParagraphs("\n\n  hello world  \n\n\n");
    expect(paras).toHaveLength(1);
    expect(paras[0]!.text).toBe("  hello world  ");
  });

  it("handles CRLF line endings", () => {
    const paras = splitParagraphs("a\r\n\r\nb");
    expect(paras).toEqual([
      { start: 0, end: 1, text: "a" },
      { start: 5, end: 6, text: "b" },
    ]);
  });

  it("keeps a fenced block with a blank line inside as one paragraph", () => {
    const text = "```\ncode\n\nmore code\n```";
    const paras = splitParagraphs(text);
    expect(paras).toHaveLength(1);
    expect(paras[0]!.text).toBe(text);
  });

  it("chunks a 12000-char paragraph into pieces of at most 5000", () => {
    const sentence = "This is a fairly long sentence that keeps going. ";
    const text = sentence.repeat(300).slice(0, 12000);
    expect(text.length).toBe(12000);
    const paras = splitParagraphs(text);
    expect(paras.length).toBeGreaterThanOrEqual(3);
    for (const p of paras) {
      expect(p.end - p.start).toBeLessThanOrEqual(5000);
      expect(p.text).toBe(text.slice(p.start, p.end));
    }
    expect(paras.map((p) => p.text).join("")).toBe(text);
  });

  it("returns nothing for empty or whitespace-only text", () => {
    expect(splitParagraphs("")).toEqual([]);
    expect(splitParagraphs("   \n\n  ")).toEqual([]);
  });
});
