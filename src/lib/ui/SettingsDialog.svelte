<script lang="ts">
  import { aiTestConnection, deleteApiKey, hasApiKey, setApiKey } from "../ipc";
  import { saveSettings, settings } from "../settings/store.svelte";

  let { open, onClose }: { open: boolean; onClose: () => void } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let apiKeyField = $state("");
  let keySaved = $state(false);
  let testResult = $state("");
  let testBusy = $state(false);
  let saveError = $state("");

  $effect(() => {
    if (open && dialogEl && !dialogEl.open) {
      dialogEl.showModal();
      testResult = "";
      saveError = "";
      void hasApiKey()
        .then((v) => (keySaved = v))
        .catch(() => (keySaved = false));
    } else if (!open && dialogEl?.open) {
      dialogEl.close();
    }
  });

  async function onTest(): Promise<void> {
    testBusy = true;
    testResult = "";
    try {
      await aiTestConnection(
        settings.cloud.baseUrl,
        settings.cloud.model,
        apiKeyField ? apiKeyField : undefined,
      );
      testResult = "Connection ok.";
    } catch (e) {
      testResult = `Test failed (${String(e)}).`;
    } finally {
      testBusy = false;
    }
  }

  async function onRemoveKey(): Promise<void> {
    await deleteApiKey().catch(() => undefined);
    keySaved = false;
    apiKeyField = "";
  }

  async function onSave(): Promise<void> {
    saveError = "";
    try {
      if (apiKeyField) {
        await setApiKey(apiKeyField);
        apiKeyField = "";
        keySaved = true;
      }
      await saveSettings();
      onClose();
    } catch (e) {
      saveError = `Could not save (${String(e)}).`;
    }
  }
</script>

<dialog bind:this={dialogEl} class="settings-dialog" onclose={() => onClose()}>
  <h2>Settings</h2>

  <fieldset>
    <legend>Engine</legend>
    <label><input type="radio" bind:group={settings.engine} value="off" /> Off (Harper only)</label>
    <label><input type="radio" bind:group={settings.engine} value="local" /> Local model</label>
    <label><input type="radio" bind:group={settings.engine} value="cloud" /> Cloud API</label>
  </fieldset>

  {#if settings.engine === "cloud"}
    <fieldset>
      <legend>Cloud</legend>
      <label class="field">
        Base URL
        <input type="text" bind:value={settings.cloud.baseUrl} placeholder="https://api.example.com/v1" />
      </label>
      <label class="field">
        Model
        <input type="text" bind:value={settings.cloud.model} placeholder="model name" />
      </label>
      <label class="field">
        API key
        <input type="password" bind:value={apiKeyField} placeholder={keySaved ? "" : "paste key"} autocomplete="off" />
      </label>
      {#if keySaved}
        <p class="note">Key saved <button type="button" onclick={() => void onRemoveKey()}>Remove key</button></p>
      {/if}
      <p class="note">
        <button type="button" onclick={() => void onTest()} disabled={testBusy}>Test connection</button>
        {#if testResult}<span>{testResult}</span>{/if}
      </p>
      <p class="note">Your text is sent to this server when you use AI features.</p>
    </fieldset>
  {/if}

  {#if settings.engine === "local"}
    <fieldset>
      <legend>Local</legend>
      <p class="note">Set up in a later step.</p>
    </fieldset>
  {/if}

  <fieldset>
    <legend>Automatic checks</legend>
    <label>
      <input type="checkbox" bind:checked={settings.autoCheck.enabled} />
      Check sentences automatically
    </label>
    {#if settings.engine === "cloud"}
      <label>
        <input type="checkbox" bind:checked={settings.autoCheck.allowCloud} />
        Allow automatic cloud checks (sends text as you type)
      </label>
    {/if}
  </fieldset>

  {#if saveError}<p class="note error">{saveError}</p>{/if}
  <div class="dialog-actions">
    <button type="button" onclick={() => onClose()}>Cancel</button>
    <button type="button" class="primary" onclick={() => void onSave()}>Save</button>
  </div>
</dialog>
