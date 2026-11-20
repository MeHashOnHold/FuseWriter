<script lang="ts">
  import EngineBadge from "./EngineBadge.svelte";

  let {
    safe,
    other,
    badgeText,
    offDevice,
    autoCloud = false,
    sending = false,
    words,
    note = "",
  }: {
    safe: number;
    other: number;
    badgeText: string;
    offDevice: boolean;
    autoCloud?: boolean;
    sending?: boolean;
    words: number;
    note?: string;
  } = $props();

  const left = $derived(
    safe > 0
      ? `${safe} quick fix${safe === 1 ? "" : "es"}, Tab to fix all`
      : other > 0
        ? `${other} to review`
        : "",
  );
</script>

<footer class="bar bottom">
  <span class="fix-count">{note || left}</span>
  <span class="spacer"></span>
  <EngineBadge text={badgeText} {offDevice} {autoCloud} {sending} />
  <span class="word-count">{words} words</span>
</footer>
