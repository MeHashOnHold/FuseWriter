import type { Settings } from "../types";

/** Defaults from Plan.md Section 6. The API key is NOT part of
 * settings — it lives in the OS keychain. */
export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  engine: "off",
  autoCheck: { enabled: true, allowCloud: false, pauseMs: 700 },
  dialect: "american",
  cloud: { baseUrl: "", model: "", temperature: null, consentHosts: [] },
  local: { modelId: "gemma-4-e2b", idleStopMinutes: 10 },
  rewrite: { activePresetId: "fluent", customPresets: [] },
};
