import { getSettings, saveSettings as saveToRust } from "../ipc";
import type { Settings } from "../types";
import { DEFAULT_SETTINGS } from "./defaults";

/** The single reactive settings object for the whole UI. */
export const settings = $state<Settings>(structuredClone(DEFAULT_SETTINGS));

export async function loadSettings(): Promise<void> {
  try {
    const loaded = await getSettings();
    Object.assign(settings, loaded);
  } catch {
    // Keep defaults; Rust also falls back to defaults on any problem.
  }
}

export async function saveSettings(): Promise<void> {
  await saveToRust($state.snapshot(settings));
}
