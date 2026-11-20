import { describe, expect, it } from "vitest";
import { placeholdersIntact, protectText, restoreText } from "./protect";

describe("protectText / restoreText", () => {
  it("round trip restores the exact original", () => {
    const input = "See https://example.com/a?b=1 and `code()` or mail me at a.b@example.co.uk.";
    const { text, map } = protectText(input, []);
    expect(text).not.toContain("https://");
    expect(text).not.toContain("code()");
    expect(restoreText(text, map)).toBe(input);
  });

  it("protects URL + code + email + frozen word in one text", () => {
    const input = "FuseWriter links https://x.io with `run()` — ask sam@x.io about FuseWriter.";
    const { text, map } = protectText(input, ["FuseWriter"]);
    expect(map.size).toBe(5); // URL + code + email + both FuseWriter mentions
    expect(text).not.toContain("FuseWriter");
    expect(restoreText(text, map)).toBe(input);
  });

  it("frozen words match whole words only, case-sensitively", () => {
    const { text } = protectText("The cat sat. Catapult! cat", ["cat"]);
    expect(text).toContain("The [[P1]] sat.");
    expect(text).toContain("Catapult!");
  });

  it("fenced code is one placeholder, even with newlines", () => {
    const input = "Before\n```\nlet x = 1;\nlet y = 2;\n```\nAfter";
    const { text, map } = protectText(input, []);
    expect(map.size).toBe(1);
    expect(restoreText(text, map)).toBe(input);
  });
});

describe("placeholdersIntact", () => {
  const { map } = protectText("Go https://a.io then https://b.io end", []);

  it("true when all appear once, in order", () => {
    expect(placeholdersIntact("Go [[P1]] then [[P2]] end", map)).toBe(true);
  });

  it("false when one is missing", () => {
    expect(placeholdersIntact("Go [[P1]] then end", map)).toBe(false);
  });

  it("false when one is duplicated", () => {
    expect(placeholdersIntact("Go [[P1]] [[P1]] then [[P2]] end", map)).toBe(false);
  });

  it("false when reordered", () => {
    expect(placeholdersIntact("Go [[P2]] then [[P1]] end", map)).toBe(false);
  });

  it("false when altered", () => {
    expect(placeholdersIntact("Go [P1] then [[P2]] end", map)).toBe(false);
  });
});
