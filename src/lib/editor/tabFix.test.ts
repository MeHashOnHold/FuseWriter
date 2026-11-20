import { describe, expect, it } from "vitest";
import { undo } from "@codemirror/commands";
import { collectSafeFixes, fixAll } from "./tabFix";
import { fakeView, makeMark } from "./testHelpers";

describe("fixAll", () => {
  it("applies 3 fixes in ONE transaction with correct final text", () => {
    const marks = [
      makeMark({ start: 0, end: 3, original: "teh", replacement: "the" }),
      makeMark({ start: 4, end: 11, original: "recieve", replacement: "receive" }),
      makeMark({ start: 12, end: 18, original: "adress", replacement: "address" }),
    ];
    const view = fakeView("teh recieve adress", marks);
    const before = view.dispatchCount;
    expect(fixAll(view)).toBe(true);
    expect(view.dispatchCount - before).toBe(1);
    expect(view.state.doc.toString()).toBe("the receive address");
  });

  it("one undo returns the exact original text", () => {
    const marks = [
      makeMark({ start: 0, end: 3, original: "teh", replacement: "the" }),
      makeMark({ start: 4, end: 11, original: "recieve", replacement: "receive" }),
    ];
    const view = fakeView("teh recieve", marks);
    expect(fixAll(view)).toBe(true);
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("teh recieve");
  });

  it("returns false and changes nothing when there are no fixes", () => {
    const view = fakeView("clean text", []);
    const before = view.dispatchCount;
    expect(fixAll(view)).toBe(false);
    expect(view.dispatchCount).toBe(before);
    expect(view.state.doc.toString()).toBe("clean text");
  });

  it("applies only the first of an overlapping pair", () => {
    const marks = [
      makeMark({ start: 0, end: 5, original: "teh c", replacement: "the c" }),
      makeMark({ start: 3, end: 8, original: "c cat", replacement: "c kat" }),
    ];
    const view = fakeView("teh c cat", marks);
    const fixes = collectSafeFixes(view.state);
    expect(fixes).toHaveLength(1);
    expect(fixes[0]!.start).toBe(0);
    expect(fixAll(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("the c cat");
  });

  it("skips a mark whose text changed", () => {
    const marks = [makeMark({ start: 0, end: 3, original: "tehX", replacement: "the" })];
    const view = fakeView("teh cat", marks);
    expect(fixAll(view)).toBe(false);
    expect(view.state.doc.toString()).toBe("teh cat");
  });

  it("never applies non-safe marks or rewrite marks", () => {
    const marks = [
      makeMark({ start: 0, end: 3, original: "teh", replacement: "the", safeToAutoApply: false }),
      makeMark({
        start: 4,
        end: 7,
        original: "cat",
        replacement: "feline",
        source: "ai-local",
        kind: "rewrite",
        safeToAutoApply: true,
      }),
    ];
    const view = fakeView("teh cat", marks);
    expect(fixAll(view)).toBe(false);
    expect(view.state.doc.toString()).toBe("teh cat");
  });

  it("keeps the cursor on the same logical spot after a length-changing fix", () => {
    const marks = [makeMark({ start: 3, end: 9, original: "adress", replacement: "address" })];
    const view = fakeView("my adress here", marks, 10);
    expect(fixAll(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("my address here");
    expect(view.state.selection.main.anchor).toBe(11);
  });
});
