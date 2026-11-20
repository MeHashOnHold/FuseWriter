import { describe, expect, it } from "vitest";
import { autoAiAllowed, autoCloudActive, engineLabel } from "./gating";
import type { Settings } from "../types";

function makeSettings(partial: Partial<Settings>): Settings {
  return {
    schemaVersion: 1,
    engine: "off",
    autoCheck: { enabled: true, allowCloud: false, pauseMs: 700 },
    dialect: "american",
    cloud: { baseUrl: "", model: "", temperature: null, consentHosts: [] },
    local: { modelId: "gemma-4-e2b", idleStopMinutes: 10 },
    rewrite: { activePresetId: "fluent", customPresets: [] },
    ...partial,
  };
}

describe("engineLabel", () => {
  it("off engine is Harper on device", () => {
    expect(engineLabel(makeSettings({ engine: "off" }))).toEqual({
      text: "Harper · on device",
      offDevice: false,
    });
  });

  it("local engine names the model, on device", () => {
    expect(engineLabel(makeSettings({ engine: "local" }))).toEqual({
      text: "Local · Gemma 4 E2B · on device",
      offDevice: false,
    });
  });

  it("cloud engine names the host and warns", () => {
    const s = makeSettings({ engine: "cloud" });
    s.cloud.baseUrl = "https://api.example.com/v1";
    expect(engineLabel(s)).toEqual({
      text: "Cloud · api.example.com · text leaves device",
      offDevice: true,
    });
  });

  it("cloud engine without a base URL is not set up", () => {
    expect(engineLabel(makeSettings({ engine: "cloud" }))).toEqual({
      text: "Cloud · not set up",
      offDevice: false,
    });
  });
});

describe("autoAiAllowed", () => {
  it("off engine never allows", () => {
    expect(autoAiAllowed(makeSettings({ engine: "off" }))).toBe(false);
  });

  it("local ignores allowCloud", () => {
    expect(autoAiAllowed(makeSettings({ engine: "local" }))).toBe(true);
  });

  it("local still needs autoCheck enabled", () => {
    const s = makeSettings({ engine: "local" });
    s.autoCheck.enabled = false;
    expect(autoAiAllowed(s)).toBe(false);
  });

  it("cloud needs allowCloud", () => {
    expect(autoAiAllowed(makeSettings({ engine: "cloud" }))).toBe(false);
    const s = makeSettings({ engine: "cloud" });
    s.autoCheck.allowCloud = true;
    expect(autoAiAllowed(s)).toBe(true);
    expect(autoCloudActive(s)).toBe(true);
  });

  it("cloud with allowCloud but autoCheck off is not allowed", () => {
    const s = makeSettings({ engine: "cloud" });
    s.autoCheck.allowCloud = true;
    s.autoCheck.enabled = false;
    expect(autoAiAllowed(s)).toBe(false);
    expect(autoCloudActive(s)).toBe(false);
  });
});
