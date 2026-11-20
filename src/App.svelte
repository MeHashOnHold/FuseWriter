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
  import { rewriteWithMode } from "./lib/ai/rewrite";
  import { presetById } from "./lib/ai/modes";
  import { wordCount } from "./lib/text/stats";
  import { aiErrorText } from "./lib/ai/errors";
  import BottomBar from "./lib/ui/BottomBar.svelte";
  import DiffView from "./lib/ui/DiffView.svelte";
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
    live: string;
    proposed: string | null;
    busy: boolean;
    error: string | null;
    notice: string | null;
  } | null>(null);

  let view: EditorView | undefined;
  let aborter: AbortController | undefined;
  let rewriteRun = 0;

  const badge = $derived(engineLabel(settings));
  const autoCloud = $derived(autoCloudActive(settings));
  const rewriteDisabled = $derived(getAiProvider(settings) === null);
  const sending = $derived(!!panel?.busy && settings.engine === "cloud");
  const aiProvider = $derived(getAiProvider(settings));

  function toolsText(): string {
    if (!view) return "";
    const sel = view.state.selection.main;
    if (sel.from !== sel.to) return view.state.sliceDoc(sel.from, sel.to);
    return view.state.doc.toString();
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
    const preset =
      presetById(settings.rewrite.activePresetId, settings.rewrite.customPresets) ??
      presetById("fluent", [])!;
    aborter = new AbortController();
    panel = { from, to, original, live: "", proposed: null, busy: true, error: null, notice: null };
    let buffer = "";
    let rafId = 0;
    let lastPaint = 0;
    const paint = () => {
      rafId = 0;
      if (rewriteRun !== run) return;
      const now = performance.now();
      if (now - lastPaint < 100) {
        rafId = requestAnimationFrame(paint);
        return;
      }
      lastPaint = now;
      if (panel) panel = { ...panel, live: buffer };
    };
    const onToken = (tok: string) => {
      buffer += tok;
      if (!rafId) rafId = requestAnimationFrame(paint);
    };
    try {
      const full = await rewriteWithMode(provider, preset, original, aborter.signal, onToken);
      if (rafId) cancelAnimationFrame(rafId);
      if (rewriteRun !== run) return;
      if (full === original) {
        panel = { from, to, original, live: "", proposed: null, busy: false, error: null, notice: "No changes suggested." };
      } else {
        panel = { from, to, original, live: "", proposed: full, busy: false, error: null, notice: null };
      }
    } catch (e) {
      if (rafId) cancelAnimationFrame(rafId);
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
    if (original.length > 6000) {
      panel = {
        from,
        to,
        original,
        live: "",
        proposed: null,
        busy: false,
        error: "Select a shorter passage.",
        notice: null,
      };
      return;
    }
    await runRewrite(provider, from, to, original, false);
  }

  function onApplyDiff(finalText: string): void {
    if (!view || !panel) return;
    const { from, to, original } = panel;
    if (view.state.sliceDoc(from, to) !== original) {
      panel = { ...panel, error: "The text changed since the rewrite. Run it again." };
      return;
    }
    view.dispatch({
      changes: { from, to, insert: finalText },
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
        words = wordCount(u.state.doc.toString());
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
    getText={toolsText}
    aiProvider={aiProvider}
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
      {#if panel.busy}
        <div class="rewrite-text">{panel.live || "Rewriting…"}</div>
        <div class="rewrite-actions">
          <button onclick={onPanelCancel}>Cancel</button>
        </div>
      {:else if panel.error}
        <div class="rewrite-error">{panel.error}</div>
        <div class="rewrite-actions">
          <button onclick={onPanelCancel}>Close</button>
        </div>
      {:else if panel.notice}
        <div class="rewrite-text">{panel.notice}</div>
        <div class="rewrite-actions">
          <button onclick={onPanelCancel}>Close</button>
        </div>
      {:else if panel.proposed !== null}
        <DiffView
          original={panel.original}
          proposed={panel.proposed}
          onApply={onApplyDiff}
          onCancel={onPanelCancel}
        />
      {/if}
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
