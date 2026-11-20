import type { Op } from "./wordDiff";

/** Diff segments: plain equal text, or a hunk the user can accept
 * (use `ins`) or reject (keep `del`) as one unit. */
export type Segment =
  | { kind: "equal"; text: string }
  | { kind: "hunk"; id: number; del: string; ins: string };

export function toSegments(ops: Op[]): Segment[] {
  const segments: Segment[] = [];
  let pending: { del: string; ins: string } | null = null;
  let nextId = 0;

  const flush = () => {
    if (pending && (pending.del !== "" || pending.ins !== "")) {
      segments.push({ kind: "hunk", id: nextId++, del: pending.del, ins: pending.ins });
    }
    pending = null;
  };

  for (const op of ops) {
    if (op.type === "equal") {
      if (pending && op.text.trim() === "") {
        // Whitespace-only gap: tentatively part of the hunk. If a real
        // equal follows, the whitespace lands in both del and ins.
        pending.del += op.text;
        pending.ins += op.text;
        continue;
      }
      flush();
      segments.push({ kind: "equal", text: op.text });
    } else {
      if (!pending) pending = { del: "", ins: "" };
      if (op.type === "delete") pending.del += op.text;
      else pending.ins += op.text;
    }
  }
  flush();
  return segments;
}

/** The document text when exactly the hunks in `accepted` are applied. */
export function applyHunks(segments: Segment[], accepted: Set<number>): string {
  let out = "";
  for (const s of segments) {
    if (s.kind === "equal") out += s.text;
    else out += accepted.has(s.id) ? s.ins : s.del;
  }
  return out;
}
