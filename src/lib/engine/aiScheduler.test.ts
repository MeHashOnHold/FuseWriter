import { EditorState } from "@codemirror/state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiProvider } from "../providers/types";
import { DEFAULT_SETTINGS } from "../settings/defaults";
import type { Settings, Suggestion } from "../types";
import { AiScheduler, type AiHost } from "./aiScheduler";
import { clearCheckCache } from "./aiChecker";

const SENTENCE = "The meeting got moved by them to tomorrow.";
const FIXED = "The meeting was moved to tomorrow.";

interface Applied {
  from: number;
  to: number;
  group: string;
  marks: Suggestion[];
}

function makeSettings(over: Partial<Settings> = {}): Settings {
  const base = structuredClone(DEFAULT_SETTINGS) as Settings;
  return {
    ...base,
    engine: "local",
    autoCheck: { enabled: true, allowCloud: false, pauseMs: 700 },
    ...over,
  };
}

interface World {
  scheduler: AiScheduler;
  applied: Applied[];
  type(text: string, at?: number): void;
  replaceAll(text: string): void;
  calls(): string[];
}

function makeWorld(
  doc: string,
  opts: {
    settings?: Settings;
    reply?: string;
    provider?: AiProvider | null;
    hasHarperMarksIn?: (from: number, to: number) => boolean;
    isComposing?: () => boolean;
  } = {},
): World {
  let state = EditorState.create({ doc });
  const applied: Applied[] = [];
  const prompts: string[] = [];
  const provider: AiProvider | null =
    opts.provider !== undefined
      ? opts.provider
      : {
          id: "local",
          label: "Gemma 4 E2B",
          sendsTextOffDevice: false,
          complete: (req) => {
            prompts.push(req.prompt);
            return Promise.resolve(opts.reply ?? FIXED);
          },
        };
  const host: AiHost = {
    getText: () => state.doc.toString(),
    applyMarks: (u) => applied.push(u),
  };
  const scheduler = new AiScheduler(host, {
    settings: () => opts.settings ?? makeSettings(),
    provider: () => provider,
    hasHarperMarksIn: opts.hasHarperMarksIn ?? (() => false),
    isComposing: opts.isComposing ?? (() => false),
  });
  return {
    scheduler,
    applied,
    type(text: string, at?: number) {
      const pos = at ?? state.doc.length;
      const tr = state.update({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } });
      state = tr.state;
      scheduler.onDocChanged(tr);
    },
    replaceAll(text: string) {
      const tr = state.update({ changes: { from: 0, to: state.doc.length, insert: text } });
      state = tr.state;
      scheduler.onDocChanged(tr);
    },
    calls: () => prompts,
  };
}

describe("AiScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCheckCache();
  });
  afterEach(() => vi.useRealTimers());

  it("pause trigger fires after pauseMs and not before", async () => {
    const w = makeWorld("");
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(699);
    expect(w.calls()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(w.calls()).toHaveLength(1);
    expect(w.applied).toHaveLength(1);
    expect(w.applied[0]!.marks[0]!.replacement).toBe(FIXED);
  });

  it("typing again resets the pause timer", async () => {
    const w = makeWorld("");
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(500);
    w.type(" More text here now.");
    await vi.advanceTimersByTimeAsync(500);
    expect(w.calls()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(200);
    expect(w.calls().length).toBeGreaterThan(0);
  });

  it("sentence-end trigger fires after 150 ms", async () => {
    const w = makeWorld("");
    w.type("The meeting got moved by them to tomorrow");
    w.type(".");
    await vi.advanceTimersByTimeAsync(300);
    expect(w.calls()).toHaveLength(0);
    w.type(" ");
    await vi.advanceTimersByTimeAsync(149);
    expect(w.calls()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(w.calls()).toHaveLength(1);
  });

  it("an in-flight check is aborted when its sentence is edited", async () => {
    let seenSignal: AbortSignal | undefined;
    const hanging: AiProvider = {
      id: "local",
      label: "Gemma 4 E2B",
      sendsTextOffDevice: false,
      complete: (_req, _h, signal) => {
        seenSignal = signal;
        return new Promise<string>(() => undefined);
      },
    };
    const w = makeWorld("", { provider: hanging });
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(700);
    expect(seenSignal).toBeDefined();
    expect(seenSignal!.aborted).toBe(false);
    w.type("x", 10);
    expect(seenSignal!.aborted).toBe(true);
  });

  it("two requests never run at once", async () => {
    let active = 0;
    let maxActive = 0;
    let callCount = 0;
    const slow: AiProvider = {
      id: "local",
      label: "Gemma 4 E2B",
      sendsTextOffDevice: false,
      complete: async () => {
        callCount++;
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 300));
        active--;
        return callCount === 1 ? FIXED : "Second one was fixed well.";
      },
    };
    const w = makeWorld("", { provider: slow });
    w.type(SENTENCE + " Second one needs fixing badly.");
    await vi.advanceTimersByTimeAsync(700);
    expect(callCount).toBe(1);
    await vi.advanceTimersByTimeAsync(300);
    expect(callCount).toBe(2);
    await vi.advanceTimersByTimeAsync(300);
    expect(maxActive).toBe(1);
  });

  it("skip rule: sentence shorter than 12 chars", async () => {
    const w = makeWorld("");
    w.type("Hi there.");
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.calls()).toHaveLength(0);
  });

  it("skip rule: sentence longer than 600 chars", async () => {
    const w = makeWorld("");
    w.type("Word ".repeat(130) + "ends here.");
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.calls()).toHaveLength(0);
  });

  it("skip rule: Harper marks inside the sentence", async () => {
    const w = makeWorld("", { hasHarperMarksIn: () => true });
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.calls()).toHaveLength(0);
  });

  it("skip rule: composing (IME) blocks checks", async () => {
    const w = makeWorld("", { isComposing: () => true });
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.calls()).toHaveLength(0);
  });

  it("skip rule: a sentence that is only a URL", async () => {
    const w = makeWorld("");
    w.type("https://example.com/some/guide");
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.calls()).toHaveLength(0);
  });

  it("skip rule: no provider means no calls", async () => {
    const w = makeWorld("", { provider: null });
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.applied).toHaveLength(0);
  });

  it("cloud engine with allowCloud=false makes zero provider calls", async () => {
    let calls = 0;
    const cloud: AiProvider = {
      id: "cloud",
      label: "api.example.com",
      sendsTextOffDevice: true,
      complete: () => {
        calls++;
        return Promise.resolve(FIXED);
      },
    };
    const settings = makeSettings({
      engine: "cloud",
      autoCheck: { enabled: true, allowCloud: false, pauseMs: 700 },
    });
    const w = makeWorld("", { provider: cloud, settings });
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toBe(0);
  });

  it("a result applies at the tracked range after text is inserted before it", async () => {
    let release: ((v: string) => void) | undefined;
    const pending: AiProvider = {
      id: "local",
      label: "Gemma 4 E2B",
      sendsTextOffDevice: false,
      complete: () =>
        new Promise<string>((res) => {
          release = res;
        }),
    };
    const w = makeWorld("", { provider: pending });
    w.type(SENTENCE);
    await vi.advanceTimersByTimeAsync(700);
    w.type("Intro words here. ", 0);
    release!(FIXED);
    await vi.advanceTimersByTimeAsync(0);
    expect(w.applied).toHaveLength(1);
    expect(w.applied[0]!.from).toBe(18);
    expect(w.applied[0]!.marks[0]!.original).toBe(SENTENCE);
  });
});
