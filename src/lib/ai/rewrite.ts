import type { AiProvider } from "../providers/types";
import { buildPrompt } from "./prompts";

/** Minimal fluent rewrite (M4-T11). Validation, retries, and the
 * other modes arrive in M5. */
export async function rewriteText(
  provider: AiProvider,
  text: string,
  signal: AbortSignal,
  onToken: (t: string) => void,
): Promise<string> {
  const prompt = buildPrompt({ mode: "fluent", text });
  const maxTokens = Math.min(2048, Math.ceil(text.length / 2) + 128);
  return provider.complete(
    { origin: "user", task: "rewrite", prompt, maxTokens },
    { onToken },
    signal,
  );
}
