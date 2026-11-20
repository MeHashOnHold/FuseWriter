<script lang="ts">
  import type { AiProvider } from "../providers/types";
  import Icon from "./Icon.svelte";
  import ModePicker from "./ModePicker.svelte";
  import ToolsMenu from "./ToolsMenu.svelte";

  let {
    name,
    onSettings,
    onRewrite,
    rewriteDisabled = true,
    getText,
    aiProvider,
  }: {
    name: string;
    onSettings: () => void;
    onRewrite: () => void;
    rewriteDisabled?: boolean;
    getText: () => string;
    aiProvider: AiProvider | null;
  } = $props();
</script>

<header class="bar top">
  <span class="doc-name">{name}</span>
  <span class="spacer"></span>
  <ModePicker />
  <button onclick={() => onRewrite()} disabled={rewriteDisabled} title="Rewrite with AI">
    <Icon name="sparkle" /> Rewrite
  </button>
  <ToolsMenu {getText} provider={aiProvider} />
  <button onclick={() => onSettings()} title="Settings" aria-label="Settings">
    <Icon name="sliders" />
  </button>
</header>
