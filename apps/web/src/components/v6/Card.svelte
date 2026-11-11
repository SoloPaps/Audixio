<script lang="ts">
interface Props {
  title: string;
  body: string;
  disabled?: boolean;
}

let { title, body, disabled = false }: Props = $props();
</script>

<article class="card" aria-disabled={disabled ? 'true' : undefined} tabindex="0">
  <h2>{title}</h2>
  <p>{body}</p>
</article>
