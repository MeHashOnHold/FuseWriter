<script lang="ts">
  import type { Segment } from "../diff/hunks";

  let {
    segments,
    accepted,
    onToggle,
    interactive = false,
  }: {
    segments: Segment[];
    accepted: Set<number>;
    onToggle?: (id: number) => void;
    interactive?: boolean;
  } = $props();

  function onKey(e: KeyboardEvent, id: number): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle?.(id);
    }
  }
</script>

<p class="inline-diff">
  {#each segments as seg, i (i)}
    {#if seg.kind === "equal"}<span>{seg.text}</span>{:else if accepted.has(seg.id)}<!-- svelte-ignore a11y_no_noninteractive_tabindex --><span
        class="hunk"
        class:interactive
        role={interactive ? "button" : undefined}
        tabindex={interactive ? 0 : undefined}
        onclick={() => interactive && onToggle?.(seg.id)}
        onkeydown={(e) => interactive && onKey(e, seg.id)}
        >{#if seg.del}<span class="del">{seg.del}</span>{/if}{#if seg.ins}<span class="ins">{seg.ins}</span>{/if}</span
      >{:else}<!-- svelte-ignore a11y_no_noninteractive_tabindex --><span
        class="hunk"
        class:interactive
        role={interactive ? "button" : undefined}
        tabindex={interactive ? 0 : undefined}
        onclick={() => interactive && onToggle?.(seg.id)}
        onkeydown={(e) => interactive && onKey(e, seg.id)}
        ><span class="del dim">{seg.del}</span></span
      >{/if}
  {/each}
</p>
