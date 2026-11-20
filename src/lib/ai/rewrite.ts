import { AiError, type AiProvider } from "../providers/types";
import type { RewritePreset } from "../types";
import { buildPrompt } from "./prompts";
import { protectText, restoreText } from "./protect";
import { cleanOutput, validate } from "./validate";

/**
 * Full rewrite flow (Plan.md M5-T08): protect placeholders, prompt,
 * stream, clean + validate, retry once with the retry suffix, then
 * restore. An "unchanged" result is returned as-is (the UI shows
 * "No changes suggested."); any other validation failure after the
 * retry throws, leaving the user's text untouched.
 */
export async function rewriteWithMode(
  provider: AiProvider,
  preset: RewritePreset,
  text: string,
  signal: AbortSignal,
  onToken: (t: string) => void,
): Promise<string> {
  const { text: protectedText, map } = protectText(text, preset.frozenWords);
  const mode = preset.builtIn ? preset.id : "custom";
  const maxTokens = Math.min(2048, Math.ceil(text.length / 2) + 128);

  const attempt = async (retry: boolean): Promise<string> => {
    const prompt = buildPrompt({
      mode,
      text: protectedText,
      frozenWords: preset.frozenWords,
      customInstruction: preset.builtIn ? undefined : preset.instruction,
      retry,
    });
    const raw = await provider.complete(
      { origin: "user", task: "rewrite", prompt, maxTokens },
      { onToken },
      signal,
    );
    const cleaned = cleanOutput(raw, text);
    const result = validate({ cleaned, input: text, mode, map, frozenWords: preset.frozenWords });
    if (result.ok || result.reason === "unchanged") return restoreText(cleaned, map);
    throw new Error(result.reason);
  };

  try {
    return await attempt(false);
  } catch (e) {
    if (e instanceof AiError) throw e; // transport errors are not retried
    return attempt(true).catch((e2) => {
      if (e2 instanceof AiError) throw e2;
      throw new AiError("empty", "Couldn't produce a safe rewrite. Your text is unchanged.");
    });
  }
}
