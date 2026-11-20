<script lang="ts">
  let {
    safe,
    other,
    engineLabel,
    offDevice,
    words,
  }: { safe: number; other: number; engineLabel: string; offDevice: boolean; words: number } =
    $props();

  const left = $derived(
    safe > 0
      ? `${safe} quick fix${safe === 1 ? "" : "es"}, Tab to fix all`
      : other > 0
        ? `${other} to review`
        : "",
  );
</script>

<footer class="bar bottom">
  <span>{left}</span>
  <span class="spacer"></span>
  <span class="engine">
    <span class="dot" class:on={offDevice}></span>
    {engineLabel}
  </span>
  <span>{words} word{words === 1 ? "" : "s"}</span>
</footer>

<style>
  .engine {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--warn);
    display: inline-block;
  }
  .dot.on {
    background: var(--ok);
  }
</style>
