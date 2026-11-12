<script lang="ts">
interface Props {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

let {
  label,
  href,
  variant = 'primary',
  icon = false,
  disabled = false,
  type = 'button',
}: Props = $props();

const cls = $derived(
  variant === 'ghost'
    ? 'btn btn--ghost'
    : variant === 'secondary'
      ? 'btn-s'
      : 'btn',
);
</script>

{#if href}
  <a
    class={cls}
    href={disabled ? undefined : href}
    aria-disabled={disabled ? 'true' : undefined}
  >
    {label}
    {#if icon}
      <svg aria-hidden="true"><use href="#i-arrow" /></svg>
    {/if}
  </a>
{:else}
  <button class={cls} {type} {disabled}>
    {label}
    {#if icon}
      <svg aria-hidden="true"><use href="#i-arrow" /></svg>
    {/if}
  </button>
{/if}
