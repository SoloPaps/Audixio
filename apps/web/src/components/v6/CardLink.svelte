<script lang="ts">
interface Props {
  href: string;
  title: string;
  sub: string;
  disabled?: boolean;
}

let { href, title, sub, disabled = false }: Props = $props();
</script>

<a
  class="card-l"
  href={disabled ? undefined : href}
  aria-disabled={disabled ? 'true' : undefined}
>
  <span class="ib"><svg aria-hidden="true"><use href="#i-book" /></svg></span>
  <span><b>{title}</b><small>{sub}</small></span>
  <svg class="arr" aria-hidden="true"><use href="#i-arrow" /></svg>
</a>
