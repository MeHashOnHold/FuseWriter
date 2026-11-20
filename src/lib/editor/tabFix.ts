import { Prec, Transaction, type EditorState } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import { isolateHistory } from "@codemirror/commands";
import type { Suggestion } from "../types";
import { marksField, removeMarks } from "./suggestionField";

/** Marks Tab may fix: Harper marks that are safe, still match the doc,
 * and do not overlap a previously kept fix. Sorted by start. */
export function collectSafeFixes(state: EditorState): Suggestion[] {
  const kept: Suggestion[] = [];
  const marks = state
    .field(marksField)
    .filter(
      (m) =>
        m.source === "harper" &&
        m.safeToAutoApply &&
        m.kind !== "rewrite" &&
        state.sliceDoc(m.start, m.end) === m.original,
    )
    .sort((a, b) => a.start - b.start);
  for (const m of marks) {
    const prev = kept[kept.length - 1];
    if (prev && m.start < prev.end) continue;
    kept.push(m);
  }
  return kept;
}

/** Apply every safe fix in ONE transaction (one undo step). Returns
 * false when there is nothing to fix, so Tab falls through. */
export function fixAll(view: EditorView): boolean {
  const fixes = collectSafeFixes(view.state);
  if (fixes.length === 0) return false;
  view.dispatch({
    changes: fixes.map((f) => ({ from: f.start, to: f.end, insert: f.replacement })),
    effects: removeMarks.of(fixes.map((f) => f.id)),
    annotations: [Transaction.userEvent.of("input.autofix"), isolateHistory.of("full")],
  });
  return true;
}

export const tabFixKeymap = Prec.highest(keymap.of([{ key: "Tab", run: fixAll }]));
