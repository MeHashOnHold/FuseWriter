import { localStatus } from "../ipc";
import type { LocalStatus } from "../types";

/** Shared snapshot of the Rust-side local runtime status. The registry
 * reads it synchronously; App refreshes it on mount and the settings
 * dialog refreshes it after install/remove. */
export const localState = $state<{ status: LocalStatus | null }>({ status: null });

export async function refreshLocalStatus(): Promise<void> {
  localState.status = await localStatus().catch(() => null);
}

export function localModelInstalled(modelId: string): boolean {
  return localState.status?.models.find((m) => m.id === modelId)?.installed ?? false;
}
