import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder, type ViewUpdate } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { marksField } from "./suggestionField";
import { marksDecorations } from "./marks";

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--bg)", color: "var(--fg)" },
  ".cm-scroller": { fontFamily: "var(--font)", fontSize: "17px", lineHeight: "1.7" },
  ".cm-content": {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "32px 20px 120px",
    caretColor: "var(--accent)",
  },
  "&.cm-focused": { outline: "none" },
});

export function createEditor(
  parent: HTMLElement,
  onChange: (u: ViewUpdate) => void,
): EditorView {
  const state = EditorState.create({
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      placeholder("Start writing…"),
      EditorView.updateListener.of(onChange),
      EditorView.contentAttributes.of({
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Document",
      }),
      theme,
      marksField,
      marksDecorations,
    ],
  });
  return new EditorView({ state, parent });
}
