<script lang="ts">
  import type { Suggestion } from "../types";
  import Icon from "./Icon.svelte";

  let {
    mark,
    x,
    y,
    onAccept,
    onDismiss,
    onClose,
  }: {
    mark: Suggestion;
    x: number;
    y: number;
    onAccept: (replacement?: string) => void;
    onDismiss: () => void;
    onClose: () => void;
  } = $props();

  const colorVar = $derived(
    mark.kind === "spelling"
      ? "var(--mark-spell)"
      : mark.kind === "grammar"
        ? "var(--mark-grammar)"
        : "var(--mark-ai)",
  );
</script>

<div class="suggestion-card" style="left: {x}px; top: {y}px;" role="dialog" aria-label="Suggestion">
  <div class="card-change">
    <span class="card-old" style="color: {colorVar}">{mark.original}</span>
    <span class="card-arrow">→</span>
    <strong>{mark.replacement}</strong>
    <span class="spacer"></span>
    <button class="card-x" onclick={() => onClose()} aria-label="Close">
      <Icon name="x" />
    </button>
  </div>
  {#if mark.reason}
    <p class="card-reason">{mark.reason}</p>
  {/if}
  <div class="card-actions">
    <button class="primary" onclick={() => onAccept()}>Accept</button>
    <button onclick={() => onDismiss()}>Dismiss</button>
  </div>
  {#if mark.alternatives.length > 0}
    <div class="card-alts">
      {#each mark.alternatives.slice(0, 3) as alt (alt)}
        <button class="alt" onclick={() => onAccept(alt)}>{alt}</button>
      {/each}
    </div>
  {/if}
</div>
