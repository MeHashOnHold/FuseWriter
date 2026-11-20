/** Sentence splitting with exact offsets (Plan.md M7-T01).
 * Offsets are UTF-16 code units into the original string; for every
 * result, `text === full.slice(start, end)`. */

export interface Sentence {
  start: number;
  end: number;
  text: string;
}

const ABBREVIATIONS = new Set([
  "mr.",
  "mrs.",
  "ms.",
  "dr.",
  "prof.",
  "st.",
  "vs.",
  "etc.",
  "e.g.",
  "i.e.",
  "inc.",
  "ltd.",
]);

const CLOSERS = new Set(['"', "'", "”", "’", ")", "]"]);

function isWs(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

/** Would a sentence really end at the punctuation at index `i`? */
function isRealEnd(text: string, i: number): boolean {
  if (text[i] !== ".") return true; // ! and ? always end
  // Ellipsis: a run of 2+ dots ends only when not followed by a lowercase letter.
  let runStart = i;
  while (runStart > 0 && text[runStart - 1] === ".") runStart--;
  let runEnd = i;
  while (runEnd + 1 < text.length && text[runEnd + 1] === ".") runEnd++;
  if (runEnd - runStart + 1 >= 2) {
    let j = runEnd + 1;
    while (j < text.length && (CLOSERS.has(text[j]!) || isWs(text[j]!))) j++;
    const next = j < text.length ? text[j]! : "";
    return !(next >= "a" && next <= "z");
  }
  // Single capital initial: "J."
  const prev = i > 0 ? text[i - 1]! : "";
  if (prev >= "A" && prev <= "Z" && (i - 1 === 0 || isWs(text[i - 2]!))) {
    return false;
  }
  // Abbreviations: the token ending at this period.
  let tokStart = i;
  while (tokStart > 0 && /[\p{L}.]/u.test(text[tokStart - 1]!)) tokStart--;
  const token = (text.slice(tokStart, i) + ".").toLowerCase();
  if (ABBREVIATIONS.has(token)) return false;
  return true;
}

export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const skipWs = (from: number): number => {
    let j = from;
    while (j < text.length && isWs(text[j]!)) j++;
    return j;
  };
  const push = (start: number, rawEnd: number): void => {
    let end = rawEnd;
    while (end > start && isWs(text[end - 1]!)) end--;
    if (end > start) out.push({ start, end, text: text.slice(start, end) });
  };

  let start = skipWs(0);
  let i = start;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "\n") {
      push(start, i);
      start = skipWs(i + 1);
      i = start;
      continue;
    }
    if (ch === "." || ch === "!" || ch === "?") {
      let j = i + 1;
      while (j < text.length && CLOSERS.has(text[j]!)) j++;
      const atEnd = j >= text.length;
      if ((atEnd || isWs(text[j]!)) && isRealEnd(text, i)) {
        push(start, j);
        start = skipWs(j);
        i = start;
        continue;
      }
    }
    i++;
  }
  push(start, text.length);
  return out;
}

/** The sentence containing `pos`, or the one ending right before it
 * when `pos` sits in the whitespace after a sentence. */
export function sentenceAt(text: string, pos: number): Sentence | null {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return null;
  for (const s of sentences) {
    if (pos >= s.start && pos <= s.end) return s;
  }
  let before: Sentence | null = null;
  for (const s of sentences) {
    if (s.end <= pos) before = s;
    else break;
  }
  return before ?? sentences[0]!;
}
