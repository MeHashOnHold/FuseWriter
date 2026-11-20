import { Channel, invoke } from "@tauri-apps/api/core";
import type {
  AiEvent,
  AiRequest,
  CheckResult,
  Dialect,
  InstallEvent,
  LocalStatus,
  Settings,
} from "./types";
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

// ---- Local runtime (M6) ----

export function localStatus(): Promise<LocalStatus> {
  return invoke<LocalStatus>("local_status");
}

export function localInstall(
  modelId: string,
  onEvent: (e: InstallEvent) => void,
): Promise<void> {
  const channel = new Channel<InstallEvent>();
  channel.onmessage = onEvent;
  return invoke("local_install", { modelId, onEvent: channel });
}

export function localCancelInstall(): Promise<void> {
  return invoke("local_cancel_install");
}

export function localRemove(modelId: string): Promise<void> {
  return invoke("local_remove", { modelId });
}

export function localStop(): Promise<void> {
  return invoke("local_stop");
}

export function localRemoveRuntime(): Promise<void> {
  return invoke("local_remove_runtime");
}

export function readTextFile(path: string): Promise<string> {
  return invoke("read_text_file", { path });
}

export function writeTextFile(path: string, text: string): Promise<void> {
  return invoke("write_text_file", { path, text });
}
