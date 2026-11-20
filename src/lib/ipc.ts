import { invoke } from "@tauri-apps/api/core";
import type { CheckResult, Dialect, RawSuggestion } from "./types";

export async function checkText(text: string, dialect: Dialect): Promise<RawSuggestion[]> {
  const r = await invoke<CheckResult>("check_text", { text, dialect });
  return r.suggestions;
}
