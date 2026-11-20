import { StateEffect, StateField, type ChangeSet, type Text } from "@codemirror/state";
import type { Suggestion } from "../types";
import { isMarkTouched } from "./touch";

export const setMarks = StateEffect.define<{
  from: number;
  to: number;
  group: "harper" | "ai";
  marks: Suggestion[];
}>();

export const removeMarks = StateEffect.define<string[]>();

function groupOf(m: Suggestion): "harper" | "ai" {
  return m.source === "harper" ? "harper" : "ai";
}

/** Map marks through a change set, dropping any mark the edit touches. */
export function mapMarks(marks: Suggestion[], changes: ChangeSet, newDoc: Text): Suggestion[] {
  const out: Suggestion[] = [];
  for (const m of marks) {
    let touched = false;
    changes.iterChangedRanges((fromA, toA, fromB, toB) => {
      if (!touched && isMarkTouched(m, fromA, toA, newDoc.sliceString(fromB, toB))) {
        touched = true;
      }
    });
    if (touched) continue;
    const start = changes.mapPos(m.start, 1);
    const end = changes.mapPos(m.end, -1);
    if (start >= end) continue;
    out.push({ ...m, start, end });
  }
  return out;
}

export const marksField = StateField.define<Suggestion[]>({
  create: () => [],
  update(value, tr) {
    let marks = value;
    if (tr.docChanged) {
      marks = mapMarks(marks, tr.changes, tr.newDoc);
    }
    for (const e of tr.effects) {
      if (e.is(setMarks)) {
        const { from, to, group, marks: incoming } = e.value;
        marks = marks.filter(
          (m) => !(groupOf(m) === group && m.start >= from && m.end <= to),
        );
        marks = [...marks, ...incoming];
      } else if (e.is(removeMarks)) {
        const ids = new Set(e.value);
        marks = marks.filter((m) => !ids.has(m.id));
      }
    }
    return [...marks].sort((a, b) => a.start - b.start);
  },
});
