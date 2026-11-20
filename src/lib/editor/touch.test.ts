import { describe, expect, it } from "vitest";
import { isMarkTouched } from "./touch";

const m = { start: 10, end: 14 };

describe("isMarkTouched", () => {
  it("insert space right after -> not touched", () => {
    expect(isMarkTouched(m, 14, 14, " ")).toBe(false);
  });
  it("insert letter right after -> touched", () => {
    expect(isMarkTouched(m, 14, 14, "s")).toBe(true);
  });
  it("insert letter right before -> touched", () => {
    expect(isMarkTouched(m, 10, 10, "x")).toBe(true);
  });
  it("insert space right before -> not touched", () => {
    expect(isMarkTouched(m, 10, 10, " ")).toBe(false);
  });
  it("edit well before -> not touched", () => {
    expect(isMarkTouched(m, 0, 2, "ab")).toBe(false);
  });
  it("edit well after -> not touched", () => {
    expect(isMarkTouched(m, 20, 22, "ab")).toBe(false);
  });
  it("delete inside -> touched", () => {
    expect(isMarkTouched(m, 12, 13, "")).toBe(true);
  });
  it("replace abutting the start -> touched", () => {
    expect(isMarkTouched(m, 8, 10, "ab")).toBe(true);
  });
});
