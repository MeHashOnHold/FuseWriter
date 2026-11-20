import { beforeEach, describe, expect, it } from "vitest";
import { AiError, type AiProvider } from "../providers/types";
import { checkSentence, clearCheckCache, makeAiSuggestion } from "./aiChecker";

function fakeProvider(reply: string | ((prompt: string) => string)): {
  provider: AiProvider;
  calls: () => number;
} {
  let calls = 0;
  const provider: AiProvider = {
    id: "local",
    label: "Gemma 4 E2B",
    sendsTextOffDevice: false,
    complete: (req) => {
      calls++;
      return Promise.resolve(typeof reply === "function" ? reply(req.prompt) : reply);
    },
  };
  return { provider, calls: () => calls };
}

const SENTENCE = "The meeting got moved by them to tomorrow.";
const FIXED = "The meeting was moved to tomorrow.";

describe("checkSentence", () => {
  beforeEach(() => clearCheckCache());

  it("a valid correction becomes an outcome", async () => {
    const { provider } = fakeProvider(FIXED);
    const out = await checkSentence(provider, SENTENCE, new AbortController().signal);
    expect(out).toEqual({ replacement: FIXED, changedWords: 3 });
  });

  it("invalid output (commentary) gives null", async () => {
    const { provider } = fakeProvider("Note: I changed the voice. " + FIXED);
    expect(await checkSentence(provider, SENTENCE, new AbortController().signal)).toBeNull();
  });

  it("unchanged output gives null", async () => {
    const { provider } = fakeProvider(SENTENCE);
    expect(await checkSentence(provider, SENTENCE, new AbortController().signal)).toBeNull();
  });

  it("a second identical call is served from the cache", async () => {
    const { provider, calls } = fakeProvider(FIXED);
    await checkSentence(provider, SENTENCE, new AbortController().signal);
    await checkSentence(provider, SENTENCE, new AbortController().signal);
    expect(calls()).toBe(1);
  });

  it("changing more than half the words gives null", async () => {
    const { provider } = fakeProvider("Completely different words appear in this new sentence here.");
    expect(await checkSentence(provider, SENTENCE, new AbortController().signal)).toBeNull();
  });

  it("an aborted call is not cached", async () => {
    let calls = 0;
    const provider: AiProvider = {
      id: "local",
      label: "Gemma 4 E2B",
      sendsTextOffDevice: false,
      complete: () => {
        calls++;
        return calls === 1
          ? Promise.reject(new AiError("cancelled", "cancelled"))
          : Promise.resolve(FIXED);
      },
    };
    await expect(
      checkSentence(provider, SENTENCE, new AbortController().signal),
    ).rejects.toBeInstanceOf(AiError);
    const out = await checkSentence(provider, SENTENCE, new AbortController().signal);
    expect(out?.replacement).toBe(FIXED);
    expect(calls).toBe(2);
  });
});

describe("makeAiSuggestion", () => {
  it("builds a purple rewrite mark that is never auto-applied", () => {
    const { provider } = fakeProvider(FIXED);
    const s = makeAiSuggestion({ from: 10, to: 52 }, SENTENCE, { replacement: FIXED, changedWords: 2 }, provider);
    expect(s.kind).toBe("rewrite");
    expect(s.source).toBe("ai-local");
    expect(s.safeToAutoApply).toBe(false);
    expect(s.reason).toBe("AI suggestion: changes 2 word(s)");
    expect(s.start).toBe(10);
    expect(s.end).toBe(52);
  });
});
