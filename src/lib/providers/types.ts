import type { AiErrorCode, AiRequest, Dialect, RawSuggestion } from "../types";

export interface GrammarProvider {
  id: "harper";
  check(text: string, dialect: Dialect): Promise<RawSuggestion[]>;
}

export interface AiProvider {
  id: "local" | "cloud";
  label: string; // "Gemma 4 E2B" or the cloud host name
  sendsTextOffDevice: boolean; // false for local, true for cloud
  complete(
    req: Omit<AiRequest, "engine">,
    handlers: { onToken?: (t: string) => void },
    signal: AbortSignal,
  ): Promise<string>; // resolves with the full text; rejects with AiError
}

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}
