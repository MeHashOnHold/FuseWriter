import { describe, expect, it } from "vitest";
import { sentenceAt, splitSentences } from "./sentences";

function texts(full: string): string[] {
  const ss = splitSentences(full);
  for (const s of ss) expect(full.slice(s.start, s.end)).toBe(s.text);
  return ss.map((s) => s.text);
}

describe("splitSentences", () => {
  it("splits two plain sentences", () => {
    expect(texts("The cat sat. The dog ran.")).toEqual(["The cat sat.", "The dog ran."]);
  });

  it("does not split after Mr. / Dr. / Prof. / St.", () => {
    expect(texts("Mr. Smith met Dr. Jones. They talked.")).toEqual([
      "Mr. Smith met Dr. Jones.",
      "They talked.",
    ]);
    expect(texts("Prof. Lee lives on St. Mary Avenue. She walks.")).toEqual([
      "Prof. Lee lives on St. Mary Avenue.",
      "She walks.",
    ]);
  });

  it("does not split after Mrs. / Ms. / vs. / Inc. / Ltd.", () => {
    expect(texts("Mrs. A and Ms. B work at Acme Inc. It is big.")).toEqual([
      "Mrs. A and Ms. B work at Acme Inc. It is big.",
    ]);
    expect(texts("The case of Smith vs. Jones ended. Court rose.")).toEqual([
      "The case of Smith vs. Jones ended.",
      "Court rose.",
    ]);
    expect(texts("Widgets Ltd. hired staff. Growth followed.")).toEqual([
      "Widgets Ltd. hired staff.",
      "Growth followed.",
    ]);
  });

  it("does not split inside e.g. / i.e. / etc.", () => {
    expect(texts("Use a fruit, e.g. an apple, i.e. something sweet, etc. daily. It helps.")).toEqual([
      "Use a fruit, e.g. an apple, i.e. something sweet, etc. daily.",
      "It helps.",
    ]);
  });

  it("does not split a decimal", () => {
    expect(texts("Pi is 3.14 and e is 2.71. Both are irrational.")).toEqual([
      "Pi is 3.14 and e is 2.71.",
      "Both are irrational.",
    ]);
  });

  it("does not split a single capital initial", () => {
    expect(texts("J. R. R. Tolkien wrote books. Many read them.")).toEqual([
      "J. R. R. Tolkien wrote books.",
      "Many read them.",
    ]);
  });

  it("handles closing quotes", () => {
    expect(texts('He said "Go." Then left.')).toEqual(['He said "Go."', "Then left."]);
  });

  it("ellipsis before a lowercase letter does not split", () => {
    expect(texts("Well... maybe later. OK.")).toEqual(["Well... maybe later.", "OK."]);
  });

  it("ellipsis before a capital splits", () => {
    expect(texts("It ended... Then silence.")).toEqual(["It ended...", "Then silence."]);
  });

  it("splits at newlines", () => {
    expect(texts("First line here\nSecond line here")).toEqual([
      "First line here",
      "Second line here",
    ]);
  });

  it("keeps a final sentence without punctuation", () => {
    expect(texts("One done. Two pending")).toEqual(["One done.", "Two pending"]);
  });

  it("empty and whitespace-only text give no sentences", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   \n  ")).toEqual([]);
  });

  it("question and exclamation marks end sentences", () => {
    expect(texts("Really? Yes! Done.")).toEqual(["Really?", "Yes!", "Done."]);
  });

  it("leading whitespace is excluded from starts", () => {
    const ss = splitSentences("   Hello world.   Bye now.");
    expect(ss[0]).toEqual({ start: 3, end: 15, text: "Hello world." });
    expect(ss[1]!.text).toBe("Bye now.");
  });
});

describe("sentenceAt", () => {
  const full = "The cat sat. The dog ran fast.";

  it("finds the containing sentence", () => {
    expect(sentenceAt(full, 2)?.text).toBe("The cat sat.");
    expect(sentenceAt(full, 20)?.text).toBe("The dog ran fast.");
  });

  it("whitespace after a sentence returns that sentence", () => {
    expect(sentenceAt(full, 12)?.text).toBe("The cat sat.");
    expect(sentenceAt(full, 13)?.text).toBe("The dog ran fast.");
  });

  it("empty text returns null", () => {
    expect(sentenceAt("", 0)).toBeNull();
  });
});
