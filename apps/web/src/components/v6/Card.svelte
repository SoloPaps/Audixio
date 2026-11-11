<script lang="ts">
  interface Props {
    heading: string;
    body: string;
    disabled?: boolean;
  }

  let { heading, body, disabled = false }: Props = $props();
</script>

<article class="card" aria-disabled={disabled ? 'true' : undefined} tabindex="0">
  <h2>{heading}</h2>
  <p>{body}</p>
</article>
