import { describe, expect, it } from "vitest";
import { countSyllables, readability, readingTimeMinutes, wordCount } from "./stats";

describe("wordCount", () => {
  it("counts words with apostrophes and hyphens as one", () => {
    expect(wordCount("Don't stop-gap me")).toBe(3);
  });

  it("empty text is zero", () => {
    expect(wordCount("")).toBe(0);
  });
});

describe("readingTimeMinutes", () => {
  it("zero words is zero minutes", () => {
    expect(readingTimeMinutes(0)).toBe(0);
  });

  it("rounds up with a minimum of 1", () => {
    expect(readingTimeMinutes(10)).toBe(1);
    expect(readingTimeMinutes(238)).toBe(1);
    expect(readingTimeMinutes(239)).toBe(2);
    expect(readingTimeMinutes(476)).toBe(2);
  });
});

describe("countSyllables", () => {
  it("known words", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("table")).toBe(2);
    expect(countSyllables("the")).toBe(1);
    // Heuristic result for "beautiful" is 3 (eau | i | u).
    expect(countSyllables("beautiful")).toBe(3);
  });
});

describe("readability", () => {
  it("plain short sentences score as easy", () => {
    const r = readability("The cat sat on the mat. The dog ran in the sun. It was a hot day.");
    expect(r).not.toBeNull();
    expect(r!.readingEase).toBeGreaterThan(60);
  });

  it("returns null for short text", () => {
    expect(readability("Too short.")).toBeNull();
  });
});
