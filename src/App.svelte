<script lang="ts">
  import { onMount } from "svelte";
  import { Transaction } from "@codemirror/state";
  import type { EditorView } from "@codemirror/view";
  import { createEditor } from "./lib/editor/createEditor";
  import { marksField, setMarks } from "./lib/editor/suggestionField";
  import { countFixes } from "./lib/editor/status";
  import { SuggestionEngine, type EditorHost } from "./lib/engine/SuggestionEngine";
  import { checkText } from "./lib/ipc";
  import BottomBar from "./lib/ui/BottomBar.svelte";
  import type { Dialect } from "./lib/types";

  let hostEl: HTMLDivElement | undefined = $state();
  let safe = $state(0);
  let other = $state(0);
  let words = $state(0);

  const dialect: Dialect = "american";

  function countWords(text: string): number {
    const m = text.match(/\S+/g);
    return m ? m.length : 0;
  }

  onMount(() => {
    if (!hostEl) return;
    let view: EditorView | undefined;
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

    view = createEditor(hostEl, (u) => {
      if (u.docChanged) engine?.onDocChanged();
      const counts = countFixes(u.state.field(marksField));
      safe = counts.safe;
      other = counts.other;
      words = countWords(u.state.doc.toString());
    });

    engine = new SuggestionEngine(host, {
      checkText,
      dialect: () => dialect,
      isDismissed: () => false,
    });

    return () => {
      engine?.dispose();
      view?.destroy();
    };
  });
</script>

<div class="app">
  <header class="bar top">
    <span>Untitled</span>
    <span class="spacer"></span>
  </header>
  <div class="editor-wrap" id="editor-host" bind:this={hostEl}></div>
  <BottomBar {safe} {other} engineLabel="Harper · on device" offDevice={true} {words} />
</div>
