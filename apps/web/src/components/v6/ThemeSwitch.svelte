<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../../i18n/index.js';

let dark = $state(false);

function paint(next: 'light' | 'dark'): void {
  dark = next === 'dark';
  document.documentElement.setAttribute('data-theme', next);
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.setAttribute('content', next);
  const bar = document.querySelector('meta[name="theme-color"]');
  const ink = bar?.getAttribute(next === 'dark' ? 'data-dark' : 'data-light');
  if (bar && ink) bar.setAttribute('content', ink);
  try {
    localStorage.setItem('audigy-theme', next);
  } catch {
    /* stockage indisponible */
  }
}

function toggle(): void {
  paint(dark ? 'light' : 'dark');
}

onMount(() => {
  dark = document.documentElement.getAttribute('data-theme') === 'dark';
});
</script>

<button
  class="switch"
  type="button"
  aria-pressed={dark}
  aria-label={dark ? t('v6.theme.toLight') : t('v6.theme.toDark')}
  onclick={toggle}
>
  <svg aria-hidden="true"><use href="#i-sun" /></svg>
</button>
