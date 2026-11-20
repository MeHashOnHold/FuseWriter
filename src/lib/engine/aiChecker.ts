import { buildCheckPrompt } from "../ai/prompts";
import { protectText, restoreText } from "../ai/protect";
import { cleanOutput, validate } from "../ai/validate";
import { wordDiff } from "../diff/wordDiff";
import { toSegments } from "../diff/hunks";
import type { AiProvider } from "../providers/types";
import { wordCount } from "../text/stats";
import type { Suggestion } from "../types";
import { hashText } from "./hash";
import { Lru } from "./lru";

export interface CheckOutcome {
  replacement: string;
  changedWords: number;
}

const WORD_TOKEN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

function wordsIn(text: string): number {
  return text.match(WORD_TOKEN)?.length ?? 0;
}

/** Changed words between two texts: per diff hunk, the larger side. */
export function changedWordCount(original: string, replacement: string): number {
  let changed = 0;
  for (const seg of toSegments(wordDiff(original, replacement))) {
    if (seg.kind === "hunk") changed += Math.max(wordsIn(seg.del), wordsIn(seg.ins));
  }
  return changed;
}

const cache = new Lru<CheckOutcome | null>(300);

/** Test hook: the cache is module-level, like the real app's. */
export function clearCheckCache(): void {
  cache.clear();
}

/**
 * Check one sentence with the AI engine (Plan.md M7-T03). Returns the
 * corrected sentence, or null when the output is invalid, unchanged,
 * or changes more than half the words. Results (including null) are
 * cached per sentence + provider; an aborted call is never cached.
 */
export async function checkSentence(
  provider: AiProvider,
  sentence: string,
  signal: AbortSignal,
): Promise<CheckOutcome | null> {
  const key = hashText(`${sentence}|${provider.id}|${provider.label}`);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const { text: protectedText, map } = protectText(sentence, []);
  const raw = await provider.complete(
    {
      origin: "auto",
      task: "check",
      prompt: buildCheckPrompt(protectedText),
      maxTokens: Math.ceil(sentence.length / 2) + 64,
    },
    {},
    signal,
  );
  const cleaned = cleanOutput(raw, sentence);
  const verdict = validate({ cleaned, input: sentence, mode: "check", map, frozenWords: [] });
  let outcome: CheckOutcome | null = null;
  if (verdict.ok) {
    const replacement = restoreText(cleaned, map);
    if (replacement !== sentence) {
      const changedWords = changedWordCount(sentence, replacement);
      if (changedWords / Math.max(1, wordCount(sentence)) <= 0.5) {
        outcome = { replacement, changedWords };
      }
    }
  }
  cache.set(key, outcome);
  return outcome;
}

export function makeAiSuggestion(
  range: { from: number; to: number },
  original: string,
  result: CheckOutcome,
  provider: AiProvider,
): Suggestion {
  const source = provider.id === "local" ? "ai-local" : "ai-cloud";
  return {
    id: `${source}:rewrite:${range.from}:${range.to}:${hashText(`${original}->${result.replacement}`)}`,
    start: range.from,
    end: range.to,
    original,
    replacement: result.replacement,
    alternatives: [],
    source,
    kind: "rewrite",
    reason: `AI suggestion: changes ${result.changedWords} word(s)`,
    safeToAutoApply: false,
  };
}
