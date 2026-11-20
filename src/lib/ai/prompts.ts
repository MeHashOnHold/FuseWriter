/** Prompt building from Plan.md Section 10. M4 ships the fluent mode
 * only; the full preset set lands in M5-T04. */

const COMMON_RULES_HEAD = `You are a text editing tool. You are not a chat assistant.
Rules:
1. Output ONLY the result text. No introduction, no notes, no explanation, no quotes around it, no markdown.
2. Keep the same language as the input.
3. Keep the same meaning. Do not add facts, names, numbers or quotes that are not in the input.
4. Copy every item that looks like [[P1]], [[P2]] and so on exactly as written, once each, in the same order.`;

function commonRules(frozenWords: string[]): string {
  if (frozenWords.length === 0) return COMMON_RULES_HEAD;
  const list = frozenWords.map((w) => `"${w}"`).join(", ");
  return `${COMMON_RULES_HEAD}\n5. Keep these words and phrases exactly as written: ${list}`;
}

const FLUENT = {
  task: "Rewrite the text so it reads smoothly and naturally. Fix awkward phrasing. Keep the length about the same.",
  exampleIn: "The meeting got moved by them to tomorrow because of they were busy.",
  exampleOut: "They moved the meeting to tomorrow because they were busy.",
};

export function buildPrompt(args: {
  mode: "fluent";
  text: string;
  frozenWords?: string[];
}): string {
  const { text, frozenWords = [] } = args;
  return `${commonRules(frozenWords)}

TASK: ${FLUENT.task}

EXAMPLE
INPUT:
<<<
${FLUENT.exampleIn}
>>>
OUTPUT:
${FLUENT.exampleOut}

NOW DO THE SAME FOR THIS INPUT.
INPUT:
<<<
${text}
>>>
OUTPUT:`;
}
