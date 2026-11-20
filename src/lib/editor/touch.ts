const WORD_CHAR = /[\p{L}\p{N}'’_-]/u;

/** fromA/toA: the changed range in the OLD doc. inserted: text inserted (may be ""). */
export function isMarkTouched(
  m: { start: number; end: number },
  fromA: number,
  toA: number,
  inserted: string,
): boolean {
  const pureInsert = fromA === toA;
  if (pureInsert && fromA === m.end)
    return inserted.length > 0 && WORD_CHAR.test(inserted[0]!); // typing right after the mark
  if (pureInsert && fromA === m.start)
    return inserted.length > 0 && WORD_CHAR.test(inserted[inserted.length - 1]!); // typing right before the mark
  return fromA <= m.end && toA >= m.start; // overlap or abut
}
