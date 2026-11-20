import type { AiErrorCode } from "../types";

/** One-line, user-facing text for each AI error code. */
export const AI_ERROR_TEXT: Record<AiErrorCode, string> = {
  no_engine: "No AI engine is configured. Pick one in Settings.",
  no_api_key: "No API key is saved. Add one in Settings.",
  bad_url: "The server URL is not valid. Check Settings.",
  consent_required: "Permission is needed before sending text to this server.",
  auto_cloud_blocked: "Automatic cloud checks are off in Settings.",
  unauthorized: "The server rejected the API key.",
  not_found: "The server or model was not found.",
  rate_limited: "The server is rate limiting requests. Try again shortly.",
  network: "Could not reach the server.",
  timeout: "The server took too long to respond.",
  server: "The server returned an error.",
  cancelled: "Cancelled.",
  empty: "The server returned an empty response.",
  local_not_installed: "The local model is not installed yet.",
  local_start_failed: "The local model failed to start.",
};

export function aiErrorText(code: AiErrorCode): string {
  return AI_ERROR_TEXT[code] ?? "Something went wrong.";
}
