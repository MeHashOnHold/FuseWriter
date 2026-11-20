<script lang="ts">
  import Icon from "./Icon.svelte";

  let {
    name,
    onSettings,
    onRewrite,
    rewriteDisabled = true,
  }: {
    name: string;
    onSettings: () => void;
    onRewrite: () => void;
    rewriteDisabled?: boolean;
  } = $props();
</script>

<header class="bar top">
  <span class="doc-name">{name}</span>
  <span class="spacer"></span>
  <button onclick={() => onRewrite()} disabled={rewriteDisabled} title="Rewrite with AI">
    <Icon name="sparkle" /> Rewrite
  </button>
  <button onclick={() => onSettings()} title="Settings" aria-label="Settings">
    <Icon name="sliders" />
  </button>
</header>
