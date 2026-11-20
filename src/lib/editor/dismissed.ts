import type { Suggestion } from "../types";

/** Session-only dismissals. A dismissed suggestion stays hidden until
 * a different document is opened (clearDismissed, wired in M8-T01). */

export function dismissKey(s: Suggestion): string {
  return `${s.kind}|${s.original}|${s.replacement}|${s.reason}`;
}

const dismissedSet = new Set<string>();

export function dismiss(s: Suggestion): void {
  dismissedSet.add(dismissKey(s));
}

export function isDismissed(s: Suggestion): boolean {
  return dismissedSet.has(dismissKey(s));
}

export function clearDismissed(): void {
  dismissedSet.clear();
}
