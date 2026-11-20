import { describe, expect, it } from "vitest";
import { applyHunks, toSegments, type Segment } from "./hunks";
import { wordDiff } from "./wordDiff";

function segs(a: string, b: string): Segment[] {
  return toSegments(wordDiff(a, b));
}

function hunkIds(segments: Segment[]): number[] {
  return segments.filter((s) => s.kind === "hunk").map((s) => (s.kind === "hunk" ? s.id : -1));
}

describe("toSegments / applyHunks", () => {
  it("accept all equals the new text; reject all equals the original", () => {
    const s = segs("the cat sat here", "the dog sat there");
    const all = new Set(hunkIds(s));
    expect(applyHunks(s, all)).toBe("the dog sat there");
    expect(applyHunks(s, new Set())).toBe("the cat sat here");
  });

  it("accepting only hunk 1 of 3 mixes the texts", () => {
    const s = segs("a b c d e f g", "A b C d E f g");
    expect(hunkIds(s)).toEqual([0, 1, 2]);
    expect(applyHunks(s, new Set([1]))).toBe("a b C d e f g");
  });

  it("hunks separated only by whitespace merge into one", () => {
    const s = segs("one two", "ONE TWO");
    const hunks = s.filter((x) => x.kind === "hunk");
    expect(hunks).toHaveLength(1);
    const h = hunks[0]!;
    if (h.kind === "hunk") {
      expect(h.del).toBe("one two");
      expect(h.ins).toBe("ONE TWO");
    }
  });

  it("no changes gives no hunks", () => {
    const s = segs("same text", "same text");
    expect(hunkIds(s)).toEqual([]);
    expect(applyHunks(s, new Set())).toBe("same text");
  });
});
