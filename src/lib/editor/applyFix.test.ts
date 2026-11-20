import { describe, expect, it } from "vitest";
import { undo } from "@codemirror/commands";
import { applyFix } from "./applyFix";
import { marksField } from "./suggestionField";
import { fakeView, makeMark } from "./testHelpers";

describe("applyFix", () => {
  it("applies when the text matches and removes the mark", () => {
    const m = makeMark({ start: 2, end: 5 });
    const view = fakeView("I teh cat", [m]);
    expect(applyFix(view, m)).toBe(true);
    expect(view.state.doc.toString()).toBe("I the cat");
    expect(view.state.field(marksField)).toHaveLength(0);
  });

  it("refuses when the text changed, dropping the stale mark", () => {
    const m = makeMark({ start: 2, end: 5, original: "tehX" });
    const view = fakeView("I teh cat", [m]);
    expect(applyFix(view, m)).toBe(false);
    expect(view.state.doc.toString()).toBe("I teh cat");
    expect(view.state.field(marksField)).toHaveLength(0);
  });

  it("one undo restores the original text", () => {
    const m = makeMark({ start: 2, end: 5 });
    const view = fakeView("I teh cat", [m]);
    expect(applyFix(view, m)).toBe(true);
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("I teh cat");
  });

  it("accepts an alternative replacement", () => {
    const m = makeMark({ start: 2, end: 5, alternatives: ["thee"] });
    const view = fakeView("I teh cat", [m]);
    expect(applyFix(view, m, "thee")).toBe(true);
    expect(view.state.doc.toString()).toBe("I thee cat");
  });
});
