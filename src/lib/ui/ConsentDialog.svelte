<script lang="ts">
  let {
    host,
    onAllow,
    onCancel,
  }: {
    host: string;
    onAllow: () => void;
    onCancel: () => void;
  } = $props();
</script>

<div class="consent-overlay">
  <div class="consent-box" role="alertdialog" aria-label="Send text off device?">
    <p>Your selected text will be sent to {host}. It will leave this device. Allow?</p>
    <div class="dialog-actions">
      <button type="button" onclick={() => onCancel()}>Cancel</button>
      <button type="button" class="primary" onclick={() => onAllow()}>Allow</button>
    </div>
  </div>
</div>
