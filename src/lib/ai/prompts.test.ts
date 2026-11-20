import { describe, expect, it } from "vitest";
import { buildCheckPrompt, buildPrompt, buildSummarizePrompt } from "./prompts";

const TASKS: Record<string, string> = {
  fluent: "Rewrite the text so it reads smoothly and naturally.",
  formal: "Rewrite the text in a formal, professional tone.",
  concise: "Make the text shorter.",
  expand: "Make the text longer and clearer",
  simplify: "Rewrite the text using short sentences and plain, common words",
};

describe("buildPrompt", () => {
  for (const [mode, task] of Object.entries(TASKS)) {
    it(`${mode} prompt contains its TASK and ends with OUTPUT:`, () => {
      const p = buildPrompt({ mode, text: "Some input text." });
      expect(p).toContain(`TASK: ${task}`);
      expect(p.endsWith("OUTPUT:")).toBe(true);
      expect(p).toContain("<<<\nSome input text.\n>>>");
    });
  }

  it("a frozen word list appears quoted in rule 5", () => {
    const p = buildPrompt({ mode: "fluent", text: "x", frozenWords: ["FuseWriter", "ACME Corp"] });
    expect(p).toContain('5. Keep these words and phrases exactly as written: "FuseWriter", "ACME Corp"');
  });

  it("rule 5 is omitted when there are no frozen words", () => {
    const p = buildPrompt({ mode: "fluent", text: "x" });
    expect(p).not.toContain("Keep these words and phrases");
  });

  it("retry appends the retry sentence", () => {
    const p = buildPrompt({ mode: "fluent", text: "x", retry: true });
    expect(p).toContain("Your last answer broke the rules. Output only the result text and nothing else.");
  });

  it("a custom prompt contains the user instruction AND the common rules", () => {
    const p = buildPrompt({
      mode: "custom",
      text: "x",
      customInstruction: "Make it sound like a pirate.",
    });
    expect(p).toContain("Make it sound like a pirate. Also obey the rules above.");
    expect(p).toContain("You are a text editing tool.");
    expect(p).toContain("Output ONLY the result text.");
  });

  it("summarize and check prompts use their tasks", () => {
    expect(buildSummarizePrompt("long text")).toContain(
      "TASK: Summarize the text in 2 to 3 short sentences.",
    );
    expect(buildCheckPrompt("She dont")).toContain(
      "TASK: Fix spelling, grammar and punctuation errors",
    );
  });
});
