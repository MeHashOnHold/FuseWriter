/** Word count, reading time, and readability (Plan.md M5-T09).
 * Reading speed: 238 words per minute, a commonly cited average for
 * silent reading of English non-fiction (Brysbaert, 2019). */

const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function wordCount(text: string): number {
  return text.match(WORD_RE)?.length ?? 0;
}

export function readingTimeMinutes(words: number): number {
  if (words === 0) return 0;
  return Math.max(1, Math.ceil(words / 238));
}

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  let count = groups;
  if (w.endsWith("e") && !w.endsWith("le") && groups > 1) count -= 1;
  return Math.max(1, count);
}

export interface Readability {
  words: number;
  sentences: number;
  readingEase: number;
  grade: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function readability(text: string): Readability | null {
  const words = text.match(WORD_RE) ?? [];
  if (words.length < 10) return null;
  const sentences = Math.max(1, text.match(/[^.!?]+[.!?]+/g)?.length ?? 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wps = words.length / sentences;
  const spw = syllables / words.length;
  return {
    words: words.length,
    sentences,
    readingEase: round1(206.835 - 1.015 * wps - 84.6 * spw),
    grade: round1(0.39 * wps + 11.8 * spw - 15.59),
  };
}

/** Plain-language label for a Flesch Reading Ease score. */
export function easeLabel(ease: number): string {
  if (ease >= 70) return "Easy to read";
  if (ease >= 50) return "Fairly easy";
  if (ease >= 30) return "Somewhat difficult";
  return "Difficult";
}
