import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuggestionEngine, type EditorHost } from "./SuggestionEngine";
import type { RawSuggestion, Suggestion } from "../types";

const TEH_RAW: RawSuggestion = {
  start: 0,
  end: 3,
  original: "teh",
  replacement: "the",
  alternatives: [],
  kind: "spelling",
  reason: "Did you mean `the`?",
  safeToAutoApply: true,
};

interface Applied {
  from: number;
  to: number;
  group: "harper" | "ai";
  marks: Suggestion[];
}

function setup(text: string, opts: { dismissed?: boolean } = {}) {
  const hostState = { text };
  const applied: Applied[] = [];
  const host: EditorHost = {
    getText: () => hostState.text,
    applyMarks: (u) => applied.push(u),
  };
  const calls: string[] = [];
  const checkText = vi.fn(async (t: string) => {
    calls.push(t);
    return t.includes("teh") ? [{ ...TEH_RAW }] : [];
  });
  const engine = new SuggestionEngine(host, {
    checkText,
    dialect: () => "american",
    isDismissed: () => opts.dismissed ?? false,
  });
  return { hostState, applied, calls, checkText, engine };
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

describe("SuggestionEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks each paragraph once after 100 ms", async () => {
    const { engine, calls } = setup("teh one\n\nteh two");
    engine.onDocChanged();
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(calls).toHaveLength(2);
    engine.dispose();
  });

  it("re-checks only the changed paragraph", async () => {
    const { engine, calls, hostState } = setup("teh one\n\nfine two");
    engine.onDocChanged();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(calls).toHaveLength(2);
    hostState.text = "teh one\n\nteh two now";
    engine.onDocChanged();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(calls).toHaveLength(3);
    expect(calls[2]).toBe("teh two now");
    engine.dispose();
  });

  it("serves unchanged text from the cache with no new calls", async () => {
    const { engine, calls } = setup("teh one");
    engine.onDocChanged();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(calls).toHaveLength(1);
    engine.onDocChanged();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(calls).toHaveLength(1);
    engine.dispose();
  });

  it("discards a slow result for text that was edited meanwhile", async () => {
    const hostState = { text: "teh one" };
    const applied: Applied[] = [];
    const host: EditorHost = {
      getText: () => hostState.text,
      applyMarks: (u) => applied.push(u),
    };
    let resolveCheck: ((v: RawSuggestion[]) => void) | undefined;
    const checkText = vi.fn(
      () =>
        new Promise<RawSuggestion[]>((resolve) => {
          resolveCheck = resolve;
        }),
    );
    const engine = new SuggestionEngine(host, {
      checkText,
      dialect: () => "american",
      isDismissed: () => false,
    });
    engine.onDocChanged();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(checkText).toHaveBeenCalledTimes(1);
    hostState.text = "clean now";
    resolveCheck!([{ ...TEH_RAW }]);
    await flushMicrotasks();
    expect(applied).toHaveLength(0);
    engine.dispose();
  });

  it("applies results with absolute offsets for paragraph 2", async () => {
    const { engine, applied } = setup("fine\n\nteh");
    engine.onDocChanged();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    const p2 = applied.find((a) => a.from === 6);
    expect(p2).toBeDefined();
    expect(p2!.marks).toHaveLength(1);
    expect(p2!.marks[0]!.start).toBe(6);
    expect(p2!.marks[0]!.end).toBe(9);
    expect(p2!.marks[0]!.source).toBe("harper");
    engine.dispose();
  });

  it("filters out dismissed suggestions", async () => {
    const { engine, applied } = setup("teh one", { dismissed: true });
    engine.onDocChanged();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(applied).toHaveLength(1);
    expect(applied[0]!.marks).toHaveLength(0);
    engine.dispose();
  });
});
