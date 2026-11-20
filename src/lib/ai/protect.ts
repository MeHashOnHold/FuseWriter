/** Replace URLs, emails, code, and frozen words with [[Pn]]
 * placeholders before text goes to a model, and restore them after
 * (Plan.md M5-T05). Patterns mirror the Rust ones in M2-T04. */

const FENCED_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]+`/g;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const MAX_PLACEHOLDERS = 30;

interface Span {
  start: number;
  end: number;
  text: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collect(text: string, re: RegExp, into: Span[]): void {
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    into.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
}

export function protectText(
  text: string,
  frozenWords: string[],
): { text: string; map: Map<string, string> } {
  const spans: Span[] = [];
  collect(text, FENCED_RE, spans);
  // An opening fence with no closing fence protects to the end.
  const fenceStarts = [...text.matchAll(/```/g)].map((m) => m.index);
  for (const start of fenceStarts) {
    if (!spans.some((s) => start >= s.start && start < s.end)) {
      spans.push({ start, end: text.length, text: text.slice(start) });
    }
  }
  collect(text, INLINE_CODE_RE, spans);
  collect(text, URL_RE, spans);
  collect(text, EMAIL_RE, spans);
  for (const word of frozenWords) {
    if (!word) continue;
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapeRegExp(word)}(?![\\p{L}\\p{N}_])`,
      "gu",
    );
    collect(text, re, spans);
  }

  // Longest match wins on overlap; then take them in document order.
  spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const accepted: Span[] = [];
  for (const s of spans) {
    if (accepted.length >= MAX_PLACEHOLDERS) break;
    if (accepted.some((a) => s.start < a.end && a.start < s.end)) continue;
    accepted.push(s);
  }
  accepted.sort((a, b) => a.start - b.start);

  const map = new Map<string, string>();
  let out = "";
  let pos = 0;
  accepted.forEach((s, i) => {
    const key = `[[P${i + 1}]]`;
    map.set(key, s.text);
    out += text.slice(pos, s.start) + key;
    pos = s.end;
  });
  out += text.slice(pos);
  return { text: out, map };
}

export function restoreText(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [key, original] of map) {
    out = out.split(key).join(original);
  }
  return out;
}

/** Every placeholder appears exactly once, in numeric order. */
export function placeholdersIntact(output: string, map: Map<string, string>): boolean {
  let lastIndex = -1;
  for (const key of map.keys()) {
    const first = output.indexOf(key);
    if (first === -1) return false;
    if (output.indexOf(key, first + 1) !== -1) return false;
    if (first < lastIndex) return false;
    lastIndex = first;
  }
  return true;
}
