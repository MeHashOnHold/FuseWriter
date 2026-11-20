/** Prompt building from Plan.md Section 10: common rules, one TASK
 * with one example, and the input between <<< >>> delimiters. */

const RULES_HEAD = `You are a text editing tool. You are not a chat assistant.
Rules:
1. Output ONLY the result text. No introduction, no notes, no explanation, no quotes around it, no markdown.
2. Keep the same language as the input.
3. Keep the same meaning. Do not add facts, names, numbers or quotes that are not in the input.
4. Copy every item that looks like [[P1]], [[P2]] and so on exactly as written, once each, in the same order.`;

const RETRY_SUFFIX =
  "Your last answer broke the rules. Output only the result text and nothing else.";

function commonRules(frozenWords: string[]): string {
  if (frozenWords.length === 0) return RULES_HEAD;
  const list = frozenWords.map((w) => `"${w}"`).join(", ");
  return `${RULES_HEAD}\n5. Keep these words and phrases exactly as written: ${list}`;
}

interface ModeSpec {
  task: string;
  exampleIn: string;
  exampleOut: string;
}

const MODES: Record<string, ModeSpec> = {
  fluent: {
    task: "Rewrite the text so it reads smoothly and naturally. Fix awkward phrasing. Keep the length about the same.",
    exampleIn: "The meeting got moved by them to tomorrow because of they were busy.",
    exampleOut: "They moved the meeting to tomorrow because they were busy.",
  },
  formal: {
    task: "Rewrite the text in a formal, professional tone. Do not use contractions or slang.",
    exampleIn: "Hey, we can't make it, sorry. Can we do it next week?",
    exampleOut:
      "Unfortunately, we are unable to attend. Would it be possible to reschedule for next week?",
  },
  concise: {
    task: "Make the text shorter. Remove filler words and repetition. Keep every important fact.",
    exampleIn:
      "In my personal opinion, I think that we should probably go ahead and start the project as soon as possible.",
    exampleOut: "I think we should start the project soon.",
  },
  expand: {
    task: "Make the text longer and clearer by explaining the ideas more fully. Do not invent specific facts, numbers, names or quotes.",
    exampleIn: "The app is fast.",
    exampleOut:
      "The app is fast. It responds quickly to what you type, so you rarely have to wait.",
  },
  simplify: {
    task: "Rewrite the text using short sentences and plain, common words that a 12-year-old can understand. Keep the meaning.",
    exampleIn: "The committee deliberated extensively before reaching a determination.",
    exampleOut: "The committee talked for a long time before it made a decision.",
  },
  check: {
    task: "Fix spelling, grammar and punctuation errors in the text. Change as few words as possible. Do not rephrase. If there are no errors, output the text exactly as given.",
    exampleIn: "She dont like apples , but she eat them.",
    exampleOut: "She doesn't like apples, but she eats them.",
  },
  summarize: {
    task: "Summarize the text in 2 to 3 short sentences. Output only the summary.",
    exampleIn:
      "The team met on Tuesday to plan the release. They agreed to freeze new features on Friday and spend the next week fixing bugs. Priya will write the release notes and share them on Monday.",
    exampleOut:
      "The team planned the release on Tuesday. Features freeze on Friday, followed by a week of bug fixes, and Priya will share release notes on Monday.",
  },
};

function wrap(spec: ModeSpec, text: string, frozenWords: string[], retry: boolean): string {
  const base = `${commonRules(frozenWords)}

TASK: ${spec.task}

EXAMPLE
INPUT:
<<<
${spec.exampleIn}
>>>
OUTPUT:
${spec.exampleOut}

NOW DO THE SAME FOR THIS INPUT.
INPUT:
<<<
${text}
>>>
OUTPUT:`;
  return retry ? `${base}\n${RETRY_SUFFIX}` : base;
}

export type PromptMode =
  | "fluent"
  | "formal"
  | "concise"
  | "expand"
  | "simplify"
  | "custom";

export function buildPrompt(args: {
  mode: PromptMode | string;
  text: string;
  frozenWords?: string[];
  customInstruction?: string;
  retry?: boolean;
}): string {
  const { mode, text, frozenWords = [], customInstruction, retry = false } = args;
  if (mode === "custom") {
    const spec: ModeSpec = {
      task: `${customInstruction ?? ""} Also obey the rules above.`,
      exampleIn: MODES.fluent!.exampleIn,
      exampleOut: MODES.fluent!.exampleOut,
    };
    return wrap(spec, text, frozenWords, retry);
  }
  const spec = MODES[mode] ?? MODES.fluent!;
  return wrap(spec, text, frozenWords, retry);
}

export function buildSummarizePrompt(text: string, retry = false): string {
  return wrap(MODES.summarize!, text, [], retry);
}

export function buildCheckPrompt(text: string, retry = false): string {
  return wrap(MODES.check!, text, [], retry);
}
