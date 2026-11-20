<script lang="ts">
  import { BUILT_IN_PRESETS } from "../ai/modes";
  import { saveSettings, settings } from "../settings/store.svelte";

  function onChange(e: Event): void {
    settings.rewrite.activePresetId = (e.target as HTMLSelectElement).value;
    void saveSettings().catch(() => undefined);
  }
</script>

<select
  class="mode-picker"
  aria-label="Rewrite mode"
  value={settings.rewrite.activePresetId}
  onchange={onChange}
>
  {#each BUILT_IN_PRESETS as p (p.id)}
    <option value={p.id}>{p.name}</option>
  {/each}
  {#each settings.rewrite.customPresets as p (p.id)}
    <option value={p.id}>{p.name}</option>
  {/each}
</select>
