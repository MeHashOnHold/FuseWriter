import { describe, expect, it } from "vitest";
import { hashText } from "./hash";

describe("hashText", () => {
  it("gives the same hash for the same string", () => {
    expect(hashText("hello world")).toBe(hashText("hello world"));
  });

  it("gives different hashes for different strings", () => {
    expect(hashText("teh")).not.toBe(hashText("the"));
  });

  it("handles the empty string", () => {
    expect(typeof hashText("")).toBe("string");
    expect(hashText("").length).toBeGreaterThan(0);
  });

  it("hashes a 100,000-char string without error", () => {
    const big = "a".repeat(100_000);
    expect(typeof hashText(big)).toBe("string");
  });
});
