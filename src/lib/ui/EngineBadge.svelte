<script lang="ts">
  let {
    text,
    offDevice,
    autoCloud = false,
    sending = false,
  }: {
    text: string;
    offDevice: boolean;
    autoCloud?: boolean;
    sending?: boolean;
  } = $props();
</script>

<span class="engine-badge">
  <span class="badge-dot" class:amber={offDevice} class:pulse={autoCloud}></span>
  <span>{text}{#if autoCloud} · auto-check ON{/if}{#if sending} · sending…{/if}</span>
</span>
