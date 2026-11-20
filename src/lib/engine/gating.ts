import { hostOf } from "../providers/cloud";
import { modelLabel } from "../providers/local";
import type { Settings } from "../types";

/** What the bottom bar shows about the active engine, and whether
 * text leaves the device. Pure, so it is unit-testable. */
export function engineLabel(s: Settings): { text: string; offDevice: boolean } {
  if (s.engine === "local") {
    return { text: `Local · ${modelLabel(s.local.modelId)} · on device`, offDevice: false };
  }
  if (s.engine === "cloud") {
    if (!s.cloud.baseUrl) return { text: "Cloud · not set up", offDevice: false };
    return { text: `Cloud · ${hostOf(s.cloud.baseUrl)} · text leaves device`, offDevice: true };
  }
  return { text: "Harper · on device", offDevice: false };
}

/** May AI checks run automatically (proactive mode, M7)? */
export function autoAiAllowed(s: Settings): boolean {
  return (
    s.engine !== "off" &&
    s.autoCheck.enabled &&
    (s.engine === "local" || s.autoCheck.allowCloud)
  );
}

export function autoCloudActive(s: Settings): boolean {
  return s.engine === "cloud" && autoAiAllowed(s);
}
