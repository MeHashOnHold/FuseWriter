import { describe, expect, it } from "vitest";
import { countFixes } from "./status";
import type { Suggestion } from "../types";

function mark(safe: boolean): Suggestion {
  return {
    id: "x",
    start: 0,
    end: 1,
    original: "a",
    replacement: "b",
    alternatives: [],
    source: "harper",
    kind: "spelling",
    reason: "",
    safeToAutoApply: safe,
  };
}

describe("countFixes", () => {
  it("counts safe and other separately", () => {
    expect(countFixes([mark(true), mark(true), mark(false)])).toEqual({ safe: 2, other: 1 });
  });
  it("is zero for no marks", () => {
    expect(countFixes([])).toEqual({ safe: 0, other: 0 });
  });
});
