<script lang="ts">
  import { onMount } from "svelte";
  import { Transaction } from "@codemirror/state";
  import type { EditorView } from "@codemirror/view";
  import { createEditor, type MarkAnchor } from "./lib/editor/createEditor";
  import { marksField, removeMarks, setMarks } from "./lib/editor/suggestionField";
  import { countFixes } from "./lib/editor/status";
  import { applyFix } from "./lib/editor/applyFix";
  import { dismiss, isDismissed } from "./lib/editor/dismissed";
  import { SuggestionEngine, type EditorHost } from "./lib/engine/SuggestionEngine";
  import { checkText } from "./lib/ipc";
  import BottomBar from "./lib/ui/BottomBar.svelte";
  import SuggestionCard from "./lib/ui/SuggestionCard.svelte";
  import type { Dialect, Suggestion } from "./lib/types";

  let hostEl: HTMLDivElement | undefined = $state();
  let safe = $state(0);
  let other = $state(0);
  let words = $state(0);
  let card = $state<{ mark: Suggestion; x: number; y: number } | null>(null);

  let view: EditorView | undefined;

  const dialect: Dialect = "american";

  function countWords(text: string): number {
    const m = text.match(/\S+/g);
    return m ? m.length : 0;
  }

  function closeCard(): void {
    card = null;
  }

  function onMarkClick(mark: Suggestion | null, anchor: MarkAnchor | null): void {
    if (!mark || !anchor || !hostEl) {
      card = null;
      return;
    }
    const rect = hostEl.getBoundingClientRect();
    const x = Math.min(Math.max(anchor.left - rect.left + hostEl.scrollLeft, 0), Math.max(rect.width - 328, 0));
    const y = anchor.bottom - rect.top + hostEl.scrollTop + 8;
    card = { mark, x, y };
  }

  function onCardAccept(replacement?: string): void {
    if (card && view) applyFix(view, card.mark, replacement);
    card = null;
  }

  function onCardDismiss(): void {
    if (card && view) {
      dismiss(card.mark);
      view.dispatch({ effects: removeMarks.of([card.mark.id]) });
    }
    card = null;
  }

  function onWindowKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") card = null;
  }

  function onWindowClick(e: MouseEvent): void {
    if (!card) return;
    const t = e.target as HTMLElement;
    if (!t.closest(".suggestion-card") && !t.closest("[data-sid]")) card = null;
  }

  onMount(() => {
    if (!hostEl) return;
    let engine: SuggestionEngine | undefined;

    const host: EditorHost = {
      getText: () => view?.state.doc.toString() ?? "",
      applyMarks: (u) => {
        view?.dispatch({
          effects: setMarks.of(u),
          annotations: Transaction.addToHistory.of(false),
        });
      },
    };

    view = createEditor(
      hostEl,
      (u) => {
        if (u.docChanged) {
          engine?.onDocChanged();
          card = null;
        }
        const counts = countFixes(u.state.field(marksField));
        safe = counts.safe;
        other = counts.other;
        words = countWords(u.state.doc.toString());
      },
      onMarkClick,
    );

    engine = new SuggestionEngine(host, {
      checkText,
      dialect: () => dialect,
      isDismissed,
    });

    const el = hostEl;
    const onScroll = () => {
      card = null;
    };
    el.addEventListener("scroll", onScroll, true);

    return () => {
      el.removeEventListener("scroll", onScroll, true);
      engine?.dispose();
      view?.destroy();
      view = undefined;
    };
  });
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={onWindowClick} />

<div class="app">
  <header class="bar top">
    <span>Untitled</span>
    <span class="spacer"></span>
  </header>
  <div class="editor-wrap" id="editor-host" bind:this={hostEl}>
    {#if card}
      <SuggestionCard
        mark={card.mark}
        x={card.x}
        y={card.y}
        onAccept={onCardAccept}
        onDismiss={onCardDismiss}
        onClose={closeCard}
      />
    {/if}
  </div>
  <BottomBar {safe} {other} engineLabel="Harper · on device" offDevice={true} {words} />
</div>
