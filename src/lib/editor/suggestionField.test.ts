import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { marksField, setMarks } from "./suggestionField";
import type { Suggestion } from "../types";

function mark(start: number, end: number, source: Suggestion["source"] = "harper"): Suggestion {
  return {
    id: `${source}:spelling:${start}:${end}:1`,
    start,
    end,
    original: "teh",
    replacement: "the",
    alternatives: [],
    source,
    kind: "spelling",
    reason: "test",
    safeToAutoApply: true,
  };
}

function stateWith(marks: Suggestion[]): EditorState {
  const state = EditorState.create({
    doc: "0123456789abcdefghij",
    extensions: [marksField],
  });
  return state.update({ effects: setMarks.of({ from: 0, to: 20, group: "harper", marks }) }).state;
}

describe("marksField", () => {
  it("shifts a mark by 3 after inserting 3 chars at 0", () => {
    const s0 = stateWith([mark(10, 14)]);
    const s1 = s0.update({ changes: { from: 0, insert: "xyz" } }).state;
    const marks = s1.field(marksField);
    expect(marks).toHaveLength(1);
    expect(marks[0]!.start).toBe(13);
    expect(marks[0]!.end).toBe(17);
  });

  it("removes a mark after typing inside it", () => {
    const s0 = stateWith([mark(10, 14)]);
    const s1 = s0.update({ changes: { from: 11, insert: "x" } }).state;
    expect(s1.field(marksField)).toHaveLength(0);
  });

  it("keeps a mark after typing a space right after it", () => {
    const s0 = stateWith([mark(10, 14)]);
    const s1 = s0.update({ changes: { from: 14, insert: " " } }).state;
    const marks = s1.field(marksField);
    expect(marks).toHaveLength(1);
    expect(marks[0]!.start).toBe(10);
    expect(marks[0]!.end).toBe(14);
  });

  it("setMarks replaces only its own group inside the range", () => {
    const harperIn = mark(2, 5);
    const aiIn: Suggestion = { ...mark(3, 6, "ai-local"), kind: "rewrite" };
    const harperOut = mark(10, 14);
    const s0 = stateWith([harperIn, aiIn, harperOut]);
    const fresh = mark(1, 4);
    const s1 = s0.update({
      effects: setMarks.of({ from: 0, to: 8, group: "harper", marks: [fresh] }),
    }).state;
    const marks = s1.field(marksField);
    expect(marks.map((x) => x.start)).toEqual([1, 3, 10]);
    expect(marks.find((x) => x.start === 3)!.source).toBe("ai-local");
  });
});
