import { describe, expect, it } from "vitest";
import { getAiProvider, getGrammarProvider } from "./registry";
import { CloudProvider } from "./cloud";
import { LocalProvider } from "./local";
import { localState } from "./localStatus.svelte";
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

describe("registry", () => {
  it("grammar provider is always Harper", () => {
    expect(getGrammarProvider().id).toBe("harper");
  });

  it("off engine gives no AI provider", () => {
    expect(getAiProvider(makeSettings({ engine: "off" }))).toBeNull();
  });

  it("local engine gives an on-device provider when the model is installed", () => {
    localState.status = {
      runtimeInstalled: true,
      models: [{ id: "gemma-4-e2b", label: "Gemma 4 E2B", installed: true, sizeBytes: 1 }],
      running: false,
      activeModelId: null,
      platformSupported: true,
    };
    const p = getAiProvider(makeSettings({ engine: "local" }));
    expect(p).toBeInstanceOf(LocalProvider);
    expect(p?.sendsTextOffDevice).toBe(false);
    expect(p?.label).toBe("Gemma 4 E2B");
  });

  it("local engine gives null when the model is not installed", () => {
    localState.status = {
      runtimeInstalled: false,
      models: [{ id: "gemma-4-e2b", label: "Gemma 4 E2B", installed: false, sizeBytes: 1 }],
      running: false,
      activeModelId: null,
      platformSupported: true,
    };
    expect(getAiProvider(makeSettings({ engine: "local" }))).toBeNull();
  });

  it("cloud engine gives an off-device provider labelled by host", () => {
    const s = makeSettings({ engine: "cloud" });
    s.cloud.baseUrl = "https://api.example.com/v1";
    const p = getAiProvider(s);
    expect(p).toBeInstanceOf(CloudProvider);
    expect(p?.sendsTextOffDevice).toBe(true);
    expect(p?.label).toBe("api.example.com");
  });

  it("cloud engine with an empty base URL gives null", () => {
    expect(getAiProvider(makeSettings({ engine: "cloud" }))).toBeNull();
  });
});
