import type { ChangeSet, Text } from "@codemirror/state";
import { isMarkTouched } from "../editor/touch";
import { hashText } from "./hash";

interface Pending {
  from: number;
  to: number;
  textHash: string;
}

/** Tracks in-flight sentence ranges while the user keeps typing
 * (Plan.md M7-T02). Ranges are mapped through every change; a range
 * becomes STALE when an edit touches it, collapses it, or its text
 * no longer hashes to the value captured when it was added. */
export class PendingTracker {
  private items = new Map<string, Pending>();

  add(id: string, from: number, to: number, textHash: string): void {
    this.items.set(id, { from, to, textHash });
  }

  get(id: string): { from: number; to: number; textHash: string } | undefined {
    const p = this.items.get(id);
    return p ? { ...p } : undefined;
  }

  remove(id: string): void {
    this.items.delete(id);
  }

  /** Map all ranges through `changes`; returns (and drops) stale ids. */
  update(changes: ChangeSet, newDoc: Text): string[] {
    const stale: string[] = [];
    for (const [id, p] of this.items) {
      let touched = false;
      changes.iterChangedRanges((fromA, toA, fromB, toB) => {
        if (
          !touched &&
          isMarkTouched({ start: p.from, end: p.to }, fromA, toA, newDoc.sliceString(fromB, toB))
        ) {
          touched = true;
        }
      });
      if (touched) {
        stale.push(id);
        continue;
      }
      const from = changes.mapPos(p.from, 1);
      const to = changes.mapPos(p.to, -1);
      if (from >= to || hashText(newDoc.sliceString(from, to)) !== p.textHash) {
        stale.push(id);
        continue;
      }
      this.items.set(id, { from, to, textHash: p.textHash });
    }
    for (const id of stale) this.items.delete(id);
    return stale;
  }
}
