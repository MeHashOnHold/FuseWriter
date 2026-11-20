import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder, type ViewUpdate } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { marksField } from "./suggestionField";
import { marksDecorations } from "./marks";
import { tabFixKeymap } from "./tabFix";
import type { Suggestion } from "../types";

export interface MarkAnchor {
  left: number;
  bottom: number;
}

export type OnMarkClick = (mark: Suggestion | null, anchor: MarkAnchor | null) => void;

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

export interface FileKeyHandlers {
  open(): void;
  save(): void;
  saveAs(): void;
}

export function createDocState(
  doc: string,
  onChange: (u: ViewUpdate) => void,
  onMarkClick?: OnMarkClick,
  fileKeys?: FileKeyHandlers,
): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      history(),
      tabFixKeymap,
      ...(fileKeys
        ? [
            keymap.of([
              { key: "Mod-o", run: () => (fileKeys.open(), true) },
              { key: "Mod-s", run: () => (fileKeys.save(), true) },
              { key: "Mod-Shift-s", run: () => (fileKeys.saveAs(), true) },
            ]),
          ]
        : []),
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
      EditorView.domEventHandlers({
        click(e, view) {
          const el = (e.target as HTMLElement).closest?.("[data-sid]");
          const sid = el?.getAttribute("data-sid");
          const mark = sid ? view.state.field(marksField).find((m) => m.id === sid) : undefined;
          if (mark) {
            const rect = view.coordsAtPos(mark.start);
            onMarkClick?.(mark, rect ? { left: rect.left, bottom: rect.bottom } : null);
          } else {
            onMarkClick?.(null, null);
          }
        },
      }),
      theme,
      marksField,
      marksDecorations,
    ],
  });
}

export function createEditor(
  parent: HTMLElement,
  onChange: (u: ViewUpdate) => void,
  onMarkClick?: OnMarkClick,
  fileKeys?: FileKeyHandlers,
): EditorView {
  const state = createDocState("", onChange, onMarkClick, fileKeys);
  return new EditorView({ state, parent });
}
