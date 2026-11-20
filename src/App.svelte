<script lang="ts">
  import { onMount } from "svelte";
  import { Transaction } from "@codemirror/state";
  import type { EditorView } from "@codemirror/view";
  import { isolateHistory } from "@codemirror/commands";
  import { createEditor, type MarkAnchor } from "./lib/editor/createEditor";
  import { marksField, removeMarks, setMarks } from "./lib/editor/suggestionField";
  import { countFixes } from "./lib/editor/status";
  import { applyFix } from "./lib/editor/applyFix";
  import { dismiss, isDismissed } from "./lib/editor/dismissed";
  import { SuggestionEngine, type EditorHost } from "./lib/engine/SuggestionEngine";
  import { splitParagraphs } from "./lib/engine/paragraphs";
  import { autoCloudActive, engineLabel } from "./lib/engine/gating";
  import { checkText } from "./lib/ipc";
  import { loadSettings, saveSettings, settings } from "./lib/settings/store.svelte";
  import { getAiProvider } from "./lib/providers/registry";
  import { setConsentHandler } from "./lib/providers/cloud";
  import { AiError, type AiProvider } from "./lib/providers/types";
  import { rewriteText } from "./lib/ai/rewrite";
  import { aiErrorText } from "./lib/ai/errors";
  import BottomBar from "./lib/ui/BottomBar.svelte";
  import ConsentDialog from "./lib/ui/ConsentDialog.svelte";
  import SettingsDialog from "./lib/ui/SettingsDialog.svelte";
  import SuggestionCard from "./lib/ui/SuggestionCard.svelte";
  import TopBar from "./lib/ui/TopBar.svelte";
  import type { Suggestion } from "./lib/types";

  let hostEl: HTMLDivElement | undefined = $state();
  let safe = $state(0);
  let other = $state(0);
  let words = $state(0);
  let card = $state<{ mark: Suggestion; x: number; y: number } | null>(null);
  let settingsOpen = $state(false);
  let consentRequest = $state<{ host: string; resolve: (ok: boolean) => void } | null>(null);
  let panel = $state<{
    from: number;
    to: number;
    original: string;
    text: string;
    busy: boolean;
    error: string | null;
  } | null>(null);

  let view: EditorView | undefined;
  let aborter: AbortController | undefined;
  let rewriteRun = 0;

  const badge = $derived(engineLabel(settings));
  const autoCloud = $derived(autoCloudActive(settings));
  const rewriteDisabled = $derived(getAiProvider(settings) === null);
  const sending = $derived(!!panel?.busy && settings.engine === "cloud");

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

  function askConsent(host: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      consentRequest = { host, resolve };
    });
  }

  function onConsentAllow(): void {
    if (!consentRequest) return;
    const { host, resolve } = consentRequest;
    consentRequest = null;
    if (!settings.cloud.consentHosts.includes(host)) {
      settings.cloud.consentHosts = [...settings.cloud.consentHosts, host];
      void saveSettings().catch(() => undefined);
    }
    resolve(true);
  }

  function onConsentCancel(): void {
    if (!consentRequest) return;
    const { resolve } = consentRequest;
    consentRequest = null;
    resolve(false);
  }

  async function runRewrite(
    provider: AiProvider,
    from: number,
    to: number,
    original: string,
    retried: boolean,
  ): Promise<void> {
    const run = ++rewriteRun;
    aborter = new AbortController();
    panel = { from, to, original, text: "", busy: true, error: null };
    try {
      const full = await rewriteText(provider, original, aborter.signal, (t) => {
        if (panel && rewriteRun === run) panel = { ...panel, text: panel.text + t };
      });
      if (panel && rewriteRun === run) panel = { ...panel, text: full, busy: false };
    } catch (e) {
      if (rewriteRun !== run) return;
      if (e instanceof AiError && e.code === "cancelled") {
        panel = null;
        return;
      }
      if (
        e instanceof AiError &&
        e.code === "consent_required" &&
        provider.id === "cloud" &&
        !retried
      ) {
        // Defense in depth: Rust asked for consent the UI did not expect.
        const ok = await askConsent(provider.label);
        if (ok) {
          await runRewrite(provider, from, to, original, true);
          return;
        }
        panel = null;
        return;
      }
      const code = e instanceof AiError ? e.code : "network";
      if (panel) panel = { ...panel, busy: false, error: aiErrorText(code) };
    }
  }

  async function onRewrite(): Promise<void> {
    if (!view) return;
    const provider = getAiProvider(settings);
    if (!provider) return;
    const sel = view.state.selection.main;
    let from = sel.from;
    let to = sel.to;
    if (from === to) {
      const paras = splitParagraphs(view.state.doc.toString());
      const p = paras.find((q) => from >= q.start && from <= q.end) ?? paras[paras.length - 1];
      if (!p) return;
      from = p.start;
      to = p.end;
    }
    const original = view.state.sliceDoc(from, to);
    if (!original.trim()) return;
    await runRewrite(provider, from, to, original, false);
  }

  function onPanelReplace(): void {
    if (!view || !panel || panel.busy) return;
    const { from, to, text, original } = panel;
    if (view.state.sliceDoc(from, to) !== original) {
      panel = { ...panel, error: "The text changed since the rewrite. Run it again." };
      return;
    }
    view.dispatch({
      changes: { from, to, insert: text },
      annotations: [Transaction.userEvent.of("input.rewrite"), isolateHistory.of("full")],
    });
    panel = null;
  }

  function onPanelCancel(): void {
    rewriteRun++;
    aborter?.abort();
    panel = null;
  }

  onMount(() => {
    if (!hostEl) return;
    void loadSettings();
    setConsentHandler((host) => askConsent(host));
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
      checkText: (text, dialect) => checkText(text, dialect).then((r) => r.suggestions),
      dialect: () => settings.dialect,
      isDismissed,
    });

    const el = hostEl;
    const onScroll = () => {
      card = null;
    };
    el.addEventListener("scroll", onScroll, true);

    return () => {
      el.removeEventListener("scroll", onScroll, true);
      setConsentHandler(undefined);
      engine?.dispose();
      view?.destroy();
      view = undefined;
    };
  });
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={onWindowClick} />

<div class="app">
  <TopBar
    name="Untitled"
    onSettings={() => (settingsOpen = true)}
    onRewrite={() => void onRewrite()}
    {rewriteDisabled}
  />
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
  {#if panel}
    <div class="rewrite-panel">
      <div class="rewrite-text">{panel.busy && !panel.text ? "Rewriting…" : panel.text}</div>
      {#if panel.error}<div class="rewrite-error">{panel.error}</div>{/if}
      <div class="rewrite-actions">
        <button class="primary" onclick={onPanelReplace} disabled={panel.busy || !!panel.error}>
          Replace
        </button>
        <button onclick={onPanelCancel}>Cancel</button>
      </div>
    </div>
  {/if}
  <BottomBar
    {safe}
    {other}
    badgeText={badge.text}
    offDevice={badge.offDevice}
    {autoCloud}
    {sending}
    {words}
  />
</div>

<SettingsDialog open={settingsOpen} onClose={() => (settingsOpen = false)} />
{#if consentRequest}
  <ConsentDialog host={consentRequest.host} onAllow={onConsentAllow} onCancel={onConsentCancel} />
{/if}
