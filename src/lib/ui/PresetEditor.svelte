<script lang="ts">
  import { saveSettings, settings } from "../settings/store.svelte";
  import type { RewritePreset } from "../types";

  let draft = $state<{
    id: string | null;
    name: string;
    instruction: string;
    frozenText: string;
  } | null>(null);
  let error = $state("");

  function startAdd(): void {
    error = "";
    draft = { id: null, name: "", instruction: "", frozenText: "" };
  }

  function startEdit(p: RewritePreset): void {
    error = "";
    draft = {
      id: p.id,
      name: p.name,
      instruction: p.instruction,
      frozenText: p.frozenWords.join("\n"),
    };
  }

  async function remove(p: RewritePreset): Promise<void> {
    settings.rewrite.customPresets = settings.rewrite.customPresets.filter((x) => x.id !== p.id);
    if (settings.rewrite.activePresetId === p.id) settings.rewrite.activePresetId = "fluent";
    if (draft?.id === p.id) draft = null;
    await saveSettings().catch(() => undefined);
  }

  async function saveDraft(): Promise<void> {
    if (!draft) return;
    const name = draft.name.trim();
    const instruction = draft.instruction.trim();
    const frozenWords = draft.frozenText
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    if (name.length < 1 || name.length > 40) {
      error = "Name must be 1–40 characters.";
      return;
    }
    if (instruction.length < 1 || instruction.length > 500) {
      error = "Instruction must be 1–500 characters.";
      return;
    }
    if (frozenWords.length > 50) {
      error = "At most 50 frozen words.";
      return;
    }
    if (frozenWords.some((w) => w.length > 60)) {
      error = "Each frozen word must be at most 60 characters.";
      return;
    }
    const preset: RewritePreset = {
      id: draft.id ?? `custom-${crypto.randomUUID()}`,
      name,
      builtIn: false,
      instruction,
      frozenWords,
    };
    const existing = settings.rewrite.customPresets.filter((x) => x.id !== preset.id);
    settings.rewrite.customPresets = [...existing, preset];
    draft = null;
    error = "";
    await saveSettings().catch(() => undefined);
  }
</script>

<div class="preset-editor">
  {#each settings.rewrite.customPresets as p (p.id)}
    <div class="preset-row">
      <span class="preset-name">{p.name}</span>
      <span class="spacer"></span>
      <button type="button" onclick={() => startEdit(p)}>Edit</button>
      <button type="button" onclick={() => void remove(p)}>Delete</button>
    </div>
  {/each}
  {#if settings.rewrite.customPresets.length === 0}
    <p class="note">No custom presets yet.</p>
  {/if}
  {#if draft}
    <div class="preset-form">
      <label class="field">
        Name
        <input type="text" bind:value={draft.name} maxlength="40" />
      </label>
      <label class="field">
        Instruction
        <textarea bind:value={draft.instruction} rows="3" maxlength="500"></textarea>
      </label>
      <label class="field">
        Frozen words (one per line)
        <textarea bind:value={draft.frozenText} rows="3"></textarea>
      </label>
      {#if error}<p class="note error">{error}</p>{/if}
      <div class="dialog-actions">
        <button type="button" onclick={() => (draft = null)}>Cancel</button>
        <button type="button" class="primary" onclick={() => void saveDraft()}>Save preset</button>
      </div>
    </div>
  {:else}
    <p class="note"><button type="button" onclick={startAdd}>Add preset</button></p>
  {/if}
</div>
