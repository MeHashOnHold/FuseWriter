import { checkText } from "../ipc";
import type { Settings } from "../types";
import { CloudProvider } from "./cloud";
import { LocalProvider } from "./local";
import { localModelInstalled } from "./localStatus.svelte";
import type { AiProvider, GrammarProvider } from "./types";

export function getGrammarProvider(): GrammarProvider {
  return {
    id: "harper",
    check: async (text, dialect) => (await checkText(text, dialect)).suggestions,
  };
}

/** The active AI provider, or null when AI is off, cloud is chosen
 * but no base URL is configured, or the local model is not installed
 * (the UI then shows "Local model not installed"). */
export function getAiProvider(settings: Settings): AiProvider | null {
  if (settings.engine === "off") return null;
  if (settings.engine === "local") {
    return localModelInstalled(settings.local.modelId)
      ? new LocalProvider(settings.local.modelId)
      : null;
  }
  if (!settings.cloud.baseUrl) return null;
  return new CloudProvider(settings.cloud.baseUrl);
}
