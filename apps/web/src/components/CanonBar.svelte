<script lang="ts">
import { onMount } from 'svelte';
import { storeEnglishDictionary } from '../i18n/en-pack.js';
import { applyLocale } from '../i18n/live.js';
import { packLine } from '../i18n/pack.js';
import { type SlimKey, t } from '../i18n/slim.js';
import { storedSessionPresent } from '../lib/auth-storage.js';

interface Props {
  pathname: string;
  initial?: 'system' | 'light' | 'dark';
}

let { pathname }: Props = $props();
let loggedIn = $state(false);
let open = $state(false);
let scrolled = $state(false);
let showTop = $state(false);
let locale = $state<'fr' | 'en'>('fr');
let dark = $state(false);
let header: HTMLElement | undefined = $state();
let burger: HTMLButtonElement | undefined = $state();
let sheet: HTMLDivElement | undefined = $state();

const REPORT_PATHS = [
  '/rapport',
  '/domaine',
  '/plan',
  '/constat',
  '/badge',
  '/brief',
];

function normalize(path: string): string {
  const clean =
    path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  // La fiche /verifier/:id n’est aucune des quatre destinations.
  if (clean === '/verifier') return '/sites';
  return REPORT_PATHS.some(
    (item) => clean === item || clean.startsWith(`${item}/`),
  )
    ? '/sites'
    : clean;
}

const here = $derived(normalize(pathname));

function current(href: string): 'page' | undefined {
  if (href === '/') return here === '/' ? 'page' : undefined;
  return here === href || here.startsWith(`${href}/`) ? 'page' : undefined;
}

function tr(key: SlimKey): string {
  if (locale === 'en') return packLine(key) ?? t(key);
  return t(key);
}

const items = $derived([
  { href: '/', label: tr('nav.home') },
  { href: '/methode', label: tr('nav.method') },
  { href: '/sites', label: tr('nav.sites.long') },
  { href: '/pro', label: tr('nav.pricing') },
]);

let menuScroll = 0;

function setMenu(next: boolean, back: boolean): void {
  if (next && !open) menuScroll = window.scrollY;
  open = next;
  const root = document.documentElement;
  if (next) {
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      sheet?.querySelector<HTMLElement>('a,button')?.focus();
    }, 50);
  } else {
    root.style.overflow = '';
    document.body.style.overflow = '';
    // Certaines pages repartent en haut pendant le verrou : on rend la position.
    if (window.scrollY !== menuScroll)
      window.scrollTo({ top: menuScroll, behavior: 'instant' });
    if (back) burger?.focus({ preventScroll: true });
  }
}

function onKey(event: KeyboardEvent): void {
  if (!open || !burger || !sheet) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setMenu(false, true);
    return;
  }
  if (event.key !== 'Tab') return;
  const list: HTMLElement[] = [
    burger,
    ...sheet.querySelectorAll<HTMLElement>('a[href],button'),
  ];
  const index = list.indexOf(document.activeElement as HTMLElement);
  if (event.shiftKey && index <= 0) {
    event.preventDefault();
    list[list.length - 1]?.focus();
  } else if (!event.shiftKey && (index === list.length - 1 || index < 0)) {
    event.preventDefault();
    list[0]?.focus();
  }
}

function onScroll(): void {
  const y = window.scrollY;
  scrolled = y > 8;
  showTop = y > window.innerHeight * 0.9;
}

function toTop(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  header
    ?.querySelector<HTMLElement>('.axn-logo')
    ?.focus({ preventScroll: true });
}

async function setLocale(event: MouseEvent, next: 'fr' | 'en'): Promise<void> {
  event.preventDefault();
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

function toggleTheme(): void {
  const next = dark ? 'light' : 'dark';
  dark = next === 'dark';
  localStorage.setItem('audigy-theme', next);
  document.documentElement.setAttribute('data-theme', next);
}

onMount(() => {
  const query = new URLSearchParams(location.search).get('theme');
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('audigy-theme');
  } catch {
    saved = null;
  }
  const choice = query === 'light' || query === 'dark' ? query : saved;
  dark =
    (choice === 'light' || choice === 'dark'
      ? choice
      : document.documentElement.getAttribute('data-theme')) === 'dark';
  loggedIn = storedSessionPresent();
  if (localStorage.getItem('audigy-locale') === 'en') locale = 'en';
  applyLocale(locale);
  onScroll();
  const wide = window.matchMedia('(min-width: 901px)');
  const onWide = (event: MediaQueryListEvent): void => {
    if (event.matches) setMenu(false, false);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('keydown', onKey);
  wide.addEventListener('change', onWide);
  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('keydown', onKey);
    wide.removeEventListener('change', onWide);
  };
});
</script>

{#snippet lang()}
  <div class="axn-lang" role="group" aria-label={t('locale.label')}>
    {#if locale === 'fr'}
      <span lang="fr" aria-current="true">FR</span>
      <a href="?lang=en" lang="en" hreflang="en" aria-label={t('locale.en.short')} onclick={(event) => setLocale(event, 'en')}>EN</a>
    {:else}
      <a href="?lang=fr" lang="fr" hreflang="fr" aria-label={t('locale.fr.short')} onclick={(event) => setLocale(event, 'fr')}>FR</a>
      <span lang="en" aria-current="true">EN</span>
    {/if}
  </div>
{/snippet}

{#snippet theme()}
  <button class="axn-theme" type="button" aria-pressed={dark} aria-label={tr('theme.label')} onclick={toggleTheme}>
    <svg class="axn-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    <svg class="axn-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
  </button>
{/snippet}

{#snippet person()}
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
{/snippet}

<header class="axn site-bar" data-chrome class:is-open={open} class:is-scrolled={scrolled} id="top" bind:this={header}>
  <div class="axn-bar">
    <a class="axn-logo" href="/" aria-label={t('footer.home')}><img class="axn-logo-d" src="/marque/logo-pc.svg" alt="" width="107" height="34" decoding="async"><img class="axn-logo-m" src="/marque/logo-mobile.svg" alt="" width="36" height="36" decoding="async"></a>
    <nav aria-label={t('nav.bottom')}>
      <ul class="axn-links">
        {#each items as item (item.href)}
          <li><a href={item.href} aria-current={current(item.href)}>{item.label}</a></li>
        {/each}
      </ul>
    </nav>
    <div class="axn-tools">
      {@render lang()}
      {@render theme()}
      <a class="axn-cta" href={loggedIn ? '/compte' : '/connexion'}>{@render person()}<span class="axn-cta-txt">{loggedIn ? tr('nav.account') : tr('nav.login')}</span></a>
    </div>
    <button class="axn-burger" type="button" aria-expanded={open} aria-controls="axn-menu" aria-label={open ? t('nav.close') : t('nav.open')} bind:this={burger} onclick={() => setMenu(!open, true)}><i aria-hidden="true"><b></b><b></b><b></b></i></button>
  </div>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="axn-scrim" aria-hidden="true" onclick={() => setMenu(false, true)}></div>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div class="axn-sheet" id="axn-menu" role="dialog" aria-modal={open ? 'true' : 'false'} aria-label={t('nav.menu')} inert={!open} bind:this={sheet} onclick={(event) => { if ((event.target as HTMLElement).closest('a')) setMenu(false, false); }}>
    <nav aria-label={t('nav.mobile')}>
      <ul>
        {#each items as item, index (item.href)}
          <li style={`--i:${index}`}><a href={item.href} aria-current={current(item.href)}>{item.label}</a></li>
        {/each}
      </ul>
    </nav>
    <div class="axn-row" style="--i:4">
      {@render lang()}
      {@render theme()}
    </div>
    <div class="axn-cta-wrap"><a class="axn-cta" style="--i:5" href={loggedIn ? '/compte' : '/connexion'}>{@render person()}<span>{loggedIn ? tr('nav.account') : tr('nav.login')}</span></a></div>
  </div>
</header>
<button class="axn-top" data-chrome class:is-on={showTop} type="button" aria-label={tr('nav.backtop')} onclick={toTop}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
