import type { Suggestion } from "../types";

/** Split marks into Tab-safe fixes and the rest (for the bottom bar). */
export function countFixes(marks: Suggestion[]): { safe: number; other: number } {
  let safe = 0;
  let other = 0;
  for (const m of marks) {
    if (m.safeToAutoApply) safe++;
    else other++;
  }
  return { safe, other };
}
