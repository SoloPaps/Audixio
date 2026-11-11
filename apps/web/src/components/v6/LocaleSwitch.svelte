<script lang="ts">
import { onMount } from 'svelte';
import {
  rememberLocaleChoice,
  resumeEnglishChoice,
  settleLocaleChoice,
  storeEnglishDictionary,
} from '../../i18n/en-pack.js';
import { t } from '../../i18n/index.js';
import { applyLocale } from '../../i18n/live.js';

let locale = $state<'fr' | 'en'>('fr');

async function setLocale(next: 'fr' | 'en'): Promise<void> {
  if (next === locale) return;
  try {
    rememberLocaleChoice(next);
    if (next === 'en') {
      const stored = await storeEnglishDictionary();
      if (!stored) {
        settleLocaleChoice();
        return;
      }
    }
    settleLocaleChoice();
    localStorage.setItem('audigy-locale', next);
    locale = next;
    document.documentElement.lang = next;
    applyLocale(next);
    location.reload();
  } catch {
    locale = 'fr';
  }
}

onMount(() => {
  if (localStorage.getItem('audigy-locale') === 'en') locale = 'en';
  applyLocale(locale);
  void resumeEnglishChoice().then((resumed) => {
    if (resumed) location.reload();
  });
});
</script>

<button
  class="switch"
  type="button"
  lang={locale === 'fr' ? 'en' : 'fr'}
  aria-label={locale === 'fr' ? t('v6.lang.toEn') : t('v6.lang.toFr')}
  onclick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
>
  {locale === 'fr' ? t('v6.lang.en') : t('v6.lang.fr')}
</button>
