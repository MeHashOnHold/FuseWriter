import { Decoration, EditorView } from "@codemirror/view";
import type { Suggestion } from "../types";
import { marksField } from "./suggestionField";

export function classFor(m: Suggestion): string {
  return m.kind === "spelling" ? "qw-spell" : m.kind === "grammar" ? "qw-grammar" : "qw-ai";
}

export const marksDecorations = EditorView.decorations.compute([marksField], (state) =>
  Decoration.set(
    state
      .field(marksField)
      .map((m) =>
        Decoration.mark({
          class: classFor(m),
          attributes: { "data-sid": m.id },
        }).range(m.start, m.end),
      ),
    true,
  ),
);
