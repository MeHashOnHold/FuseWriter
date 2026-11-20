import { EditorState, type TransactionSpec } from "@codemirror/state";
import { history } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import { marksField, setMarks } from "./suggestionField";
import type { Suggestion } from "../types";

/** Test helpers: a mark factory and a fake EditorView backed by a real
 * EditorState (with history), so undo and effects behave for real. */

export function makeMark(partial: Partial<Suggestion> & { start: number; end: number }): Suggestion {
  return {
    id: `harper:spelling:${partial.start}:${partial.end}:1`,
    original: "teh",
    replacement: "the",
    alternatives: [],
    source: "harper",
    kind: "spelling",
    reason: "Did you mean the?",
    safeToAutoApply: true,
    ...partial,
  };
}

export function fakeView(doc: string, marks: Suggestion[], anchor?: number) {
  let state = EditorState.create({
    doc,
    selection: anchor !== undefined ? { anchor } : undefined,
    extensions: [history(), marksField],
  });
  for (const group of ["harper", "ai"] as const) {
    const inGroup = marks.filter((m) => (group === "harper" ? m.source === "harper" : m.source !== "harper"));
    if (inGroup.length) {
      state = state.update({
        effects: setMarks.of({ from: 0, to: doc.length, group, marks: inGroup }),
      }).state;
    }
  }
  let dispatchCount = 0;
  const view = {
    get state() {
      return state;
    },
    get dispatchCount() {
      return dispatchCount;
    },
    dispatch(spec: TransactionSpec) {
      dispatchCount++;
      state = state.update(spec).state;
    },
  };
  return view as unknown as EditorView & { readonly state: EditorState; readonly dispatchCount: number };
}
