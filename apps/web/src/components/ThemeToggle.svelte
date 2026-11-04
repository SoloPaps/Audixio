<script lang="ts">
import { onMount } from 'svelte';
import { storeEnglishDictionary } from '../i18n/en-pack.js';
import { t } from '../i18n/index.js';
import { applyLocale } from '../i18n/live.js';

interface Props {
  initial?: 'system' | 'light' | 'dark';
}

let { initial = 'system' }: Props = $props();
let dark = $state(false);
let locale = $state<'fr' | 'en'>('fr');

function toggleTheme(): void {
  const next = dark ? 'light' : 'dark';
  dark = next === 'dark';
  localStorage.setItem('audigy-theme', next);
  document.documentElement.setAttribute('data-theme', next);
}

async function setLocale(next: 'fr' | 'en'): Promise<void> {
  if (next === locale) return;
  try {
    if (next === 'en') {
      const stored = await storeEnglishDictionary();
      if (!stored) return;
    }
    localStorage.setItem('audigy-locale', next);
    locale = next;
    applyLocale(next);
    location.reload();
  } catch {
    locale = 'fr';
  }
}

onMount(() => {
  dark =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    initial === 'dark';
  if (localStorage.getItem('audigy-locale') === 'en') locale = 'en';
  applyLocale(locale);
});
</script>

<button class="axn-theme" type="button" aria-pressed={dark} aria-label={t('theme.label')} onclick={toggleTheme}>
  <svg class="axn-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  <svg class="axn-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
</button>
<button type="button" class="link-nav" lang={locale === 'fr' ? 'en' : 'fr'} onclick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}>
  {locale === 'fr' ? 'EN' : 'FR'}
</button>
