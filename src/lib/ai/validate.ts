import { LENGTH_RANGE } from "./modes";
import { placeholdersIntact, restoreText } from "./protect";

/** Clean and validate raw model output before it is shown or applied
 * (Plan.md M5-T06). */

const PREFACE_RE =
  /^(sure|certainly|of course|here(?:'s| is| are)|rewritten|output|result)[^\n]*:\s*\n/i;

const COMMENTARY_PREFIXES = ["Note:", "Explanation:", "I changed", "This rewrite", "Here is", "Here's"];

export function cleanOutput(raw: string, input: string): string {
  let out = raw.trim();
  // Surrounding code fence.
  const fence = out.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/);
  if (fence) out = fence[1]!;
  out = out.replace(PREFACE_RE, "");
  out = out.replace(/^(<<<|>>>)\s*/, "").replace(/\s*(<<<|>>>)$/, "");
  out = out.replace(/^OUTPUT:\s*/, "");
  // Surrounding quotes, unless the input itself starts with a quote.
  if (
    out.length >= 2 &&
    !input.startsWith('"') &&
    !input.startsWith("“")
  ) {
    const first = out[0];
    const last = out[out.length - 1];
    if ((first === '"' && last === '"') || (first === "“" && last === "”")) {
      out = out.slice(1, -1);
    }
  }
  return out.trim();
}

export type ValidateFailure =
  | "empty"
  | "commentary"
  | "placeholders"
  | "frozen"
  | "length"
  | "unchanged";

export function validate(args: {
  cleaned: string;
  input: string;
  mode: string;
  map: Map<string, string>;
  frozenWords: string[];
}): { ok: true } | { ok: false; reason: ValidateFailure } {
  const { cleaned, input, mode, map, frozenWords } = args;
  if (!cleaned.trim()) return { ok: false, reason: "empty" };
  for (const line of cleaned.split("\n")) {
    const trimmed = line.trimStart();
    if (COMMENTARY_PREFIXES.some((p) => trimmed.startsWith(p))) {
      return { ok: false, reason: "commentary" };
    }
  }
  if (!placeholdersIntact(cleaned, map)) return { ok: false, reason: "placeholders" };
  const restored = restoreText(cleaned, map);
  const count = (haystack: string, needle: string) =>
    needle === "" ? 0 : haystack.split(needle).length - 1;
  for (const w of frozenWords) {
    if (count(restored, w) < count(input, w)) return { ok: false, reason: "frozen" };
  }
  const range = LENGTH_RANGE[mode] ?? LENGTH_RANGE.fluent!;
  const ratio = input.length === 0 ? 1 : restored.length / input.length;
  if (ratio < range[0] || ratio > range[1]) return { ok: false, reason: "length" };
  if (restored === input) return { ok: false, reason: "unchanged" };
  return { ok: true };
}
