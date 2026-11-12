<script lang="ts">
interface Props {
  href: string;
  heading: string;
  sub: string;
  disabled?: boolean;
}

let { href, heading, sub, disabled = false }: Props = $props();
</script>

<a
  class="card-l"
  href={disabled ? undefined : href}
  aria-disabled={disabled ? 'true' : undefined}
>
  <span class="ib"><svg aria-hidden="true"><use href="#i-book" /></svg></span>
  <span><b>{heading}</b><small>{sub}</small></span>
  <svg class="arr" aria-hidden="true"><use href="#i-arrow" /></svg>
</a>
