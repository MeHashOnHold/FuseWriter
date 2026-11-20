import { aiComplete } from "../ipc";
import type { AiProvider } from "./types";
import type { AiRequest } from "../types";

export function modelLabel(modelId: string): string {
  return modelId === "gemma-4-e4b" ? "Gemma 4 E4B" : "Gemma 4 E2B";
}

export class LocalProvider implements AiProvider {
  readonly id = "local" as const;
  readonly sendsTextOffDevice = false;
  readonly label: string;

  constructor(modelId: string) {
    this.label = modelLabel(modelId);
  }

  complete(
    req: Omit<AiRequest, "engine">,
    handlers: { onToken?: (t: string) => void },
    signal: AbortSignal,
  ): Promise<string> {
    return aiComplete({ ...req, engine: "local" }, handlers.onToken, signal);
  }
}
