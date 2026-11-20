import { Transaction } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { isolateHistory } from "@codemirror/commands";
import type { Suggestion } from "../types";
import { removeMarks } from "./suggestionField";

/**
 * Accept one mark as a single undoable transaction. If the marked text
 * no longer matches (the doc moved on), just drop the mark.
 */
export function applyFix(view: EditorView, m: Suggestion, replacement: string = m.replacement): boolean {
  if (view.state.sliceDoc(m.start, m.end) !== m.original) {
    view.dispatch({ effects: removeMarks.of([m.id]) });
    return false;
  }
  view.dispatch({
    changes: { from: m.start, to: m.end, insert: replacement },
    effects: removeMarks.of([m.id]),
    annotations: [Transaction.userEvent.of("input.accept"), isolateHistory.of("full")],
  });
  return true;
}
