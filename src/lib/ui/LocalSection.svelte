<script lang="ts">
  import { ask } from "@tauri-apps/plugin-dialog";
  import { localCancelInstall, localInstall, localRemove } from "../ipc";
  import { localState, refreshLocalStatus } from "../providers/localStatus.svelte";
  import { saveSettings, settings } from "../settings/store.svelte";
  import { aiErrorText } from "../ai/errors";
  import type { AiErrorCode, LocalModelStatus } from "../types";

  let installing = $state(false);
  let stage = $state("");
  let downloaded = $state(0);
  let total = $state(0);
  let installError = $state("");

  const status = $derived(localState.status);
  const selected = $derived(status?.models.find((m) => m.id === settings.local.modelId));
  const pct = $derived(total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0);

  function gb(bytes: number): string {
    return (bytes / 1_000_000_000).toFixed(1);
  }

  function statusLine(m: LocalModelStatus | undefined): string {
    if (!m) return "";
    if (status?.running && status.activeModelId === m.id) return "Running";
    return m.installed ? "Installed" : "Not installed";
  }

  async function choose(id: "gemma-4-e2b" | "gemma-4-e4b"): Promise<void> {
    settings.local.modelId = id;
    await saveSettings().catch(() => undefined);
  }

  async function download(): Promise<void> {
    if (installing) return;
    installing = true;
    installError = "";
    stage = "Starting…";
    downloaded = 0;
    total = 0;
    try {
      await localInstall(settings.local.modelId, (e) => {
        if (e.type === "progress") {
          stage = e.stage === "runtime" ? "Downloading runtime…" : "Downloading model…";
          downloaded = e.downloaded;
          total = e.total;
        } else if (e.type === "extracting") {
          stage = "Extracting runtime…";
        } else if (e.type === "error") {
          installError = aiErrorText(e.code as AiErrorCode);
        }
      });
    } catch (err) {
      installError = aiErrorText(String(err) as AiErrorCode);
    } finally {
      installing = false;
      stage = "";
      await refreshLocalStatus();
    }
  }

  async function cancel(): Promise<void> {
    await localCancelInstall().catch(() => undefined);
  }

  async function remove(): Promise<void> {
    const ok = await ask("Remove the downloaded model from this computer?", {
      title: "FuseWriter",
      kind: "warning",
    });
    if (!ok) return;
    await localRemove(settings.local.modelId).catch(() => undefined);
    await refreshLocalStatus();
  }
</script>

{#if status && !status.platformSupported}
  <p class="note">Local models are not supported on this system yet.</p>
{:else}
  <label class="radio">
    <input
      type="radio"
      name="local-model"
      checked={settings.local.modelId === "gemma-4-e2b"}
      onchange={() => void choose("gemma-4-e2b")}
    />
    Gemma 4 E2B (default){#if status}
      — {gb(status.models.find((m) => m.id === "gemma-4-e2b")?.sizeBytes ?? 0)} GB{/if}
  </label>
  <label class="radio">
    <input
      type="radio"
      name="local-model"
      checked={settings.local.modelId === "gemma-4-e4b"}
      onchange={() => void choose("gemma-4-e4b")}
    />
    Gemma 4 E4B (better quality, larger){#if status}
      — {gb(status.models.find((m) => m.id === "gemma-4-e4b")?.sizeBytes ?? 0)} GB{/if}
  </label>
  <p class="note">
    Runs on this computer. Your text never leaves the device. Needs about {gb(
      selected?.sizeBytes ?? 0,
    )} GB of disk space and roughly that much free memory.
  </p>
  <p class="note">Status: {statusLine(selected)}</p>
  {#if installing}
    <p class="note">{stage}</p>
    <progress value={downloaded} max={total > 0 ? total : undefined}></progress>
    <p class="note">
      {(downloaded / 1_000_000).toFixed(0)} / {(total / 1_000_000).toFixed(0)} MB ({pct}%)
      <button type="button" onclick={() => void cancel()}>Cancel</button>
    </p>
  {:else}
    <p class="note">
      {#if !selected?.installed}
        <button
          type="button"
          onclick={() => void download()}
          disabled={status ? !status.platformSupported : false}
        >
          Download
        </button>
      {:else}
        <button type="button" onclick={() => void remove()}>Remove</button>
      {/if}
    </p>
  {/if}
  {#if installError}<p class="note error">{installError}</p>{/if}
{/if}
