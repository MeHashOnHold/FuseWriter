export type Dialect = "american" | "british" | "canadian" | "australian";
export type SuggestionSource = "harper" | "ai-local" | "ai-cloud";
export type SuggestionKind = "spelling" | "grammar" | "rewrite";

/** What Rust returns. Offsets are UTF-16, relative to the text that was sent. */
export interface RawSuggestion {
  start: number;
  end: number;
  original: string;
  replacement: string;
  alternatives: string[]; // up to 3 other replacements
  kind: "spelling" | "grammar";
  reason: string; // one line, plain text, max 140 chars
  safeToAutoApply: boolean;
}

/** What the editor stores. Offsets are absolute in the document. */
export interface Suggestion {
  id: string; // `${source}:${kind}:${start}:${end}:${hashText(original + "->" + replacement)}`
  start: number;
  end: number;
  original: string;
  replacement: string;
  alternatives: string[];
  source: SuggestionSource;
  kind: SuggestionKind;
  reason: string;
  safeToAutoApply: boolean; // ALWAYS false when kind === "rewrite" or source !== "harper"
}

export interface RewritePreset {
  id: string; // "fluent" | "formal" | "concise" | "expand" | "simplify" | "custom-<uuid>"
  name: string;
  builtIn: boolean;
  instruction: string; // used only for custom presets
  frozenWords: string[]; // must survive the rewrite exactly
}

export interface Settings {
  schemaVersion: 1;
  engine: "off" | "local" | "cloud";
  autoCheck: {
    enabled: boolean; // proactive AI checks (default true)
    allowCloud: boolean; // default false. Cloud auto-checks need this.
    pauseMs: number; // default 700
  };
  dialect: Dialect; // default "american"
  cloud: {
    baseUrl: string; // e.g. "https://api.example.com/v1". Default "".
    model: string; // default ""
    temperature: number | null; // default null (field not sent)
    consentHosts: string[]; // hosts the user approved, e.g. ["openrouter.ai"]
  }; // NOTE: the API key is NOT here. It is in the OS keychain.
  local: {
    modelId: "gemma-4-e2b" | "gemma-4-e4b"; // default "gemma-4-e2b"
    idleStopMinutes: number; // default 10
  };
  rewrite: {
    activePresetId: string; // default "fluent"
    customPresets: RewritePreset[];
  };
}

export interface CheckResult {
  suggestions: RawSuggestion[];
  elapsedMs: number;
}

export interface AiRequest {
  engine: "local" | "cloud";
  origin: "user" | "auto"; // Rust refuses cloud + "auto" unless autoCheck.allowCloud
  task: "check" | "rewrite" | "summarize";
  prompt: string; // full prompt, built in TS (see Section 10)
  maxTokens: number;
}

export type AiEvent =
  | { type: "token"; text: string }
  | { type: "done"; text: string }
  | { type: "error"; code: AiErrorCode; message: string };

export type AiErrorCode =
  | "no_engine"
  | "no_api_key"
  | "bad_url"
  | "consent_required"
  | "auto_cloud_blocked"
  | "unauthorized"
  | "not_found"
  | "rate_limited"
  | "network"
  | "timeout"
  | "server"
  | "cancelled"
  | "empty"
  | "local_not_installed"
  | "local_start_failed";
