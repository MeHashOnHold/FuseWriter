import { ChangeSet, EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { hashText } from "./hash";
import { PendingTracker } from "./pending";

const DOC = "First sentence here. Second one follows.";

function trackerWithSecond(): { t: PendingTracker; state: EditorState } {
  const state = EditorState.create({ doc: DOC });
  const t = new PendingTracker();
  const text = "Second one follows.";
  t.add("s2", 21, 40, hashText(text));
  return { t, state };
}

describe("PendingTracker", () => {
  it("typing before the range shifts it", () => {
    const { t, state } = trackerWithSecond();
    const changes = ChangeSet.of({ from: 0, insert: "Well, " }, DOC.length);
    const newDoc = changes.apply(state.doc);
    expect(t.update(changes, newDoc)).toEqual([]);
    expect(t.get("s2")).toMatchObject({ from: 27, to: 46 });
  });

  it("typing after the range leaves it unchanged", () => {
    const { t, state } = trackerWithSecond();
    const changes = ChangeSet.of({ from: DOC.length, insert: " More." }, DOC.length);
    const newDoc = changes.apply(state.doc);
    expect(t.update(changes, newDoc)).toEqual([]);
    expect(t.get("s2")).toMatchObject({ from: 21, to: 40 });
  });

  it("typing inside the range makes it stale", () => {
    const { t, state } = trackerWithSecond();
    const changes = ChangeSet.of({ from: 28, insert: "x" }, DOC.length);
    const newDoc = changes.apply(state.doc);
    expect(t.update(changes, newDoc)).toEqual(["s2"]);
    expect(t.get("s2")).toBeUndefined();
  });

  it("deleting the whole sentence makes it stale", () => {
    const { t, state } = trackerWithSecond();
    const changes = ChangeSet.of({ from: 21, to: 40 }, DOC.length);
    const newDoc = changes.apply(state.doc);
    expect(t.update(changes, newDoc)).toEqual(["s2"]);
  });

  it("remove drops an entry without staleness", () => {
    const { t } = trackerWithSecond();
    t.remove("s2");
    expect(t.get("s2")).toBeUndefined();
  });
});
