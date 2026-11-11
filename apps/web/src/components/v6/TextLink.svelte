<script lang="ts">
interface Props {
  href: string;
  label: string;
  disabled?: boolean;
}

let { href, label, disabled = false }: Props = $props();
</script>

<a
  class="lnk"
  href={disabled ? undefined : href}
  aria-disabled={disabled ? 'true' : undefined}
>
  <span class="lnk-i"><svg aria-hidden="true"><use href="#i-book" /></svg></span>
  {label}
  <svg class="lnk-a" aria-hidden="true"><use href="#i-arrow" /></svg>
</a>
