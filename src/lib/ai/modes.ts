import type { RewritePreset } from "../types";

/** Built-in rewrite presets (Plan.md Section 10.3). Their TASK text
 * and examples live in prompts.ts; presets carry only user-facing
 * data (name, frozen words). */
export const BUILT_IN_PRESETS: RewritePreset[] = [
  { id: "fluent", name: "Fluent", builtIn: true, instruction: "", frozenWords: [] },
  { id: "formal", name: "Formal", builtIn: true, instruction: "", frozenWords: [] },
  { id: "concise", name: "Concise", builtIn: true, instruction: "", frozenWords: [] },
  { id: "expand", name: "Expand", builtIn: true, instruction: "", frozenWords: [] },
  { id: "simplify", name: "Simplify", builtIn: true, instruction: "", frozenWords: [] },
];

/** Allowed output/input length ratios (Plan.md Section 10.4). */
export const LENGTH_RANGE: Record<string, [number, number]> = {
  fluent: [0.6, 1.5],
  formal: [0.6, 1.6],
  concise: [0.2, 0.95],
  expand: [1.1, 3.5],
  simplify: [0.5, 1.8],
  check: [0.8, 1.25],
  custom: [0.2, 4],
  summarize: [0.05, 0.8],
};

export function presetById(
  id: string,
  customPresets: RewritePreset[],
): RewritePreset | undefined {
  return BUILT_IN_PRESETS.find((p) => p.id === id) ?? customPresets.find((p) => p.id === id);
}
