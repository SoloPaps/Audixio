<script lang="ts">
import { splitInlineCode } from '../lib/inline-code.js';

interface Props {
  text: string;
}

let { text }: Props = $props();
const segments = $derived(splitInlineCode(text));
</script>

{#each segments as segment, index (index)}{#if segment.code}<code class="ic">{segment.text}</code>{:else}{segment.text}{/if}{/each}

<style>
  .ic {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.92em;
    padding: 0.05em 0.35em;
    border-radius: var(--radius-sm);
    overflow-wrap: anywhere;
  }
</style>
