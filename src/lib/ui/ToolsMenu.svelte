<script lang="ts">
  import { AiError, type AiProvider } from "../providers/types";
  import { buildSummarizePrompt } from "../ai/prompts";
  import { protectText, restoreText } from "../ai/protect";
  import { cleanOutput, validate } from "../ai/validate";
  import { aiErrorText } from "../ai/errors";
  import { easeLabel, readability, readingTimeMinutes, wordCount } from "../text/stats";
  import Icon from "./Icon.svelte";

  let {
    getText,
    provider,
  }: {
    getText: () => string;
    provider: AiProvider | null;
  } = $props();

  let open = $state(false);
  let result = $state("");
  let summary = $state("");
  let summaryBusy = $state(false);
  let summaryError = $state("");

  function showReadingTime(): void {
    const words = wordCount(getText());
    const mins = readingTimeMinutes(words);
    result = words === 0 ? "No text." : `${mins} min read · ${words} words`;
    summary = "";
    summaryError = "";
  }

  function showReadability(): void {
    const r = readability(getText());
    result = r
      ? `Reading ease ${r.readingEase} · Grade ${r.grade} · ${easeLabel(r.readingEase)}`
      : "Not enough text for readability (needs 10+ words).";
    summary = "";
    summaryError = "";
  }

  async function summarize(): Promise<void> {
    if (!provider || summaryBusy) return;
    const text = getText();
    if (!text.trim()) {
      summaryError = "No text to summarize.";
      return;
    }
    summaryBusy = true;
    summaryError = "";
    summary = "";
    result = "";
    const controller = new AbortController();
    try {
      const { text: protectedText, map } = protectText(text, []);
      const raw = await provider.complete(
        {
          origin: "user",
          task: "summarize",
          prompt: buildSummarizePrompt(protectedText),
          maxTokens: Math.min(1024, Math.ceil(text.length / 2) + 128),
        },
        {},
        controller.signal,
      );
      const cleaned = cleanOutput(raw, text);
      const check = validate({ cleaned, input: text, mode: "summarize", map, frozenWords: [] });
      if (!check.ok) summaryError = "Couldn't produce a safe summary.";
      else summary = restoreText(cleaned, map);
    } catch (e) {
      summaryError = e instanceof AiError ? aiErrorText(e.code) : "Could not summarize.";
    } finally {
      summaryBusy = false;
    }
  }

  async function copySummary(): Promise<void> {
    await navigator.clipboard.writeText(summary).catch(() => undefined);
  }

  function onWindowClick(e: MouseEvent): void {
    if (!open) return;
    const t = e.target as HTMLElement;
    if (!t.closest(".tools-menu")) open = false;
  }
</script>

<svelte:window onclick={onWindowClick} />

<span class="tools-menu">
  <button type="button" onclick={() => (open = !open)} aria-label="Tools">
    Tools <Icon name="chevron" />
  </button>
  {#if open}
    <div class="tools-popover">
      <button type="button" onclick={showReadingTime}>Reading time</button>
      <button type="button" onclick={showReadability}>Readability</button>
      <button
        type="button"
        onclick={() => void summarize()}
        disabled={!provider || summaryBusy}
        title={provider ? "" : "Needs an AI engine"}
      >
        {summaryBusy ? "Summarizing…" : "Summarize"}
      </button>
      {#if result}<p class="tools-result">{result}</p>{/if}
      {#if summaryError}<p class="tools-result error">{summaryError}</p>{/if}
      {#if summary}
        <p class="tools-result">{summary}</p>
        <button type="button" onclick={() => void copySummary()}>Copy</button>
      {/if}
    </div>
  {/if}
</span>
