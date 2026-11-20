import { Channel, invoke } from "@tauri-apps/api/core";
import type { AiEvent, AiRequest, CheckResult, Dialect, Settings } from "./types";
import { AiError } from "./providers/types";

/** Typed wrappers around the Tauri commands. The webview never builds
 * raw invoke strings anywhere else. */

export function checkText(text: string, dialect: Dialect): Promise<CheckResult> {
  return invoke<CheckResult>("check_text", { text, dialect });
}

export function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}

export function setApiKey(key: string): Promise<void> {
  return invoke("set_api_key", { key });
}

export function hasApiKey(): Promise<boolean> {
  return invoke<boolean>("has_api_key");
}

export function deleteApiKey(): Promise<void> {
  return invoke("delete_api_key");
}

export function aiTestConnection(
  baseUrl: string,
  model: string,
  apiKey?: string,
): Promise<void> {
  return invoke("ai_test_connection", { baseUrl, model, apiKey: apiKey ?? null });
}

/** Streaming AI completion. Tokens go to `onToken`; aborting `signal`
 * cancels the request in Rust. Resolves with the full text. */
export async function aiComplete(
  req: AiRequest,
  onToken: ((t: string) => void) | undefined,
  signal: AbortSignal,
): Promise<string> {
  const requestId = crypto.randomUUID();
  const channel = new Channel<AiEvent>();
  return new Promise<string>((resolve, reject) => {
    const onAbort = () => {
      void invoke("ai_cancel", { requestId });
    };
    if (signal.aborted) {
      reject(new AiError("cancelled", "cancelled"));
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    channel.onmessage = (ev) => {
      if (ev.type === "token") onToken?.(ev.text);
      else if (ev.type === "done") {
        signal.removeEventListener("abort", onAbort);
        resolve(ev.text);
      } else {
        signal.removeEventListener("abort", onAbort);
        reject(new AiError(ev.code, ev.message));
      }
    };
    invoke("ai_complete", { requestId, request: req, onEvent: channel }).catch((e) =>
      reject(new AiError("network", String(e))),
    );
  });
}
