<script lang="ts">
  import { applyHunks, toSegments } from "../diff/hunks";
  import { wordDiff } from "../diff/wordDiff";
  import InlineDiff from "./InlineDiff.svelte";

  let {
    original,
    proposed,
    onApply,
    onCancel,
  }: {
    original: string;
    proposed: string;
    onApply: (finalText: string) => void;
    onCancel: () => void;
  } = $props();

  const segments = $derived(toSegments(wordDiff(original, proposed)));
  let accepted = $state<Set<number>>(new Set());

  $effect(() => {
    accepted = new Set(
      segments.filter((s) => s.kind === "hunk").map((s) => (s.kind === "hunk" ? s.id : -1)),
    );
  });

  function toggle(id: number): void {
    const next = new Set(accepted);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    accepted = next;
  }

  function acceptAll(): void {
    accepted = new Set(
      segments.filter((s) => s.kind === "hunk").map((s) => (s.kind === "hunk" ? s.id : -1)),
    );
  }
</script>

<div class="diff-view">
  <InlineDiff {segments} {accepted} onToggle={toggle} interactive />
  <div class="rewrite-actions">
    <button type="button" onclick={acceptAll}>Accept all</button>
    <button type="button" onclick={() => (accepted = new Set())}>Reject all</button>
    <span class="spacer"></span>
    <button type="button" class="primary" onclick={() => onApply(applyHunks(segments, accepted))}>
      Apply
    </button>
    <button type="button" onclick={() => onCancel()}>Cancel</button>
  </div>
</div>
