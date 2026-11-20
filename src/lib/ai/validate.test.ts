import { describe, expect, it } from "vitest";
import { cleanOutput, validate } from "./validate";
import { protectText } from "./protect";

const INPUT = "The meeting got moved by them to tomorrow because of they were busy.";
const GOOD = "They moved the meeting to tomorrow because they were busy.";

function v(cleaned: string, extra: Partial<Parameters<typeof validate>[0]> = {}) {
  return validate({
    cleaned,
    input: INPUT,
    mode: "fluent",
    map: new Map(),
    frozenWords: [],
    ...extra,
  });
}

describe("cleanOutput", () => {
  it("trims and strips a chatty preface", () => {
    expect(cleanOutput(`Sure! Here's the rewritten text:\n${GOOD}`, INPUT)).toBe(GOOD);
  });

  it("removes a surrounding code fence", () => {
    expect(cleanOutput("```\n" + GOOD + "\n```", INPUT)).toBe(GOOD);
  });

  it("removes a leading OUTPUT: and trailing delimiters", () => {
    expect(cleanOutput(`OUTPUT: ${GOOD} >>>`, INPUT)).toBe(GOOD);
  });

  it("removes surrounding quotes unless the input starts with one", () => {
    expect(cleanOutput(`"${GOOD}"`, INPUT)).toBe(GOOD);
    expect(cleanOutput(`"quoted text stays"`, '"quoted input"')).toBe('"quoted text stays"');
  });
});

describe("validate", () => {
  it("a clean output passes", () => {
    expect(v(GOOD)).toEqual({ ok: true });
  });

  it("the cleaned chatty output passes", () => {
    const cleaned = cleanOutput(`Sure! Here's the rewritten text:\n${GOOD}`, INPUT);
    expect(v(cleaned)).toEqual({ ok: true });
  });

  it("empty fails", () => {
    expect(v("  ")).toEqual({ ok: false, reason: "empty" });
  });

  it("commentary fails", () => {
    expect(v(`${GOOD}\nNote: I changed the voice.`)).toEqual({
      ok: false,
      reason: "commentary",
    });
  });

  it("missing placeholder fails", () => {
    const { text, map } = protectText("See https://a.io for details on the plan today.", []);
    const out = text.replace("[[P1]]", "the site");
    const r = validate({ cleaned: out, input: "See https://a.io for details on the plan today.", mode: "fluent", map, frozenWords: [] });
    expect(r).toEqual({ ok: false, reason: "placeholders" });
  });

  it("intact placeholders pass and restore", () => {
    const input = "See https://a.io for the full details about our meeting tomorrow.";
    const { text, map } = protectText(input, []);
    const out = text.replace("the full details about our meeting tomorrow", "all the details on tomorrow's meeting");
    const r = validate({ cleaned: out, input, mode: "fluent", map, frozenWords: [] });
    expect(r).toEqual({ ok: true });
  });

  it("a dropped frozen word fails", () => {
    const input = "FuseWriter is the app we use for writing every single day at work.";
    const r = validate({
      cleaned: "This is the app we use for writing every single day at work.",
      input,
      mode: "fluent",
      map: new Map(),
      frozenWords: ["FuseWriter"],
    });
    expect(r).toEqual({ ok: false, reason: "frozen" });
  });

  it("length outside the mode range fails", () => {
    expect(v("Short.")).toEqual({ ok: false, reason: "length" });
  });

  it("unchanged output reports unchanged", () => {
    expect(v(INPUT)).toEqual({ ok: false, reason: "unchanged" });
  });

  it("concise mode allows a much shorter output", () => {
    const r = validate({
      cleaned: "I think we should start the project soon.",
      input:
        "In my personal opinion, I think that we should probably go ahead and start the project as soon as possible.",
      mode: "concise",
      map: new Map(),
      frozenWords: [],
    });
    expect(r).toEqual({ ok: true });
  });
});
