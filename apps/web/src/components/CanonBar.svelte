<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { storedSessionPresent } from '../lib/auth-storage.js';
import ThemeToggle from './ThemeToggle.svelte';

interface Props {
  pathname: string;
  initial?: 'system' | 'light' | 'dark';
}

let { pathname, initial = 'system' }: Props = $props();
let loggedIn = $state(false);
let showTop = $state(false);

function normalize(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

const here = $derived(normalize(pathname));

function current(href: string): 'page' | undefined {
  if (href === '/') return here === '/' ? 'page' : undefined;
  return here === href || here.startsWith(`${href}/`) ? 'page' : undefined;
}

function onScroll(): void {
  showTop = window.scrollY > window.innerHeight * 0.9;
}

function toTop(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

onMount(() => {
  loggedIn = storedSessionPresent();
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
});

const items = [
  { href: '/', label: t('nav.home') },
  { href: '/methode', label: t('nav.method') },
  { href: '/sites', label: t('nav.sites') },
  { href: '/pro', label: t('nav.pricing') },
];
</script>

<header class="canon-bar">
  <a class="canon-logo" href="/" aria-label={t('nav.home')}>
    <img class="logo-d" src="/marque/logo-pc.svg" alt="" width="107" height="34" />
    <img class="logo-m" src="/marque/logo-mobile.svg" alt="" width="36" height="36" />
  </a>
  <nav aria-label={t('nav.main')}>
    <ul class="canon-links">
      {#each items as item (item.href)}
        <li><a href={item.href} aria-current={current(item.href)}>{item.label}</a></li>
      {/each}
    </ul>
  </nav>
  <div class="canon-tools">
    <ThemeToggle {initial} />
    {#if loggedIn}
      <a class="canon-login" href="/compte" aria-current={current('/compte')}>{t('nav.account')}</a>
    {:else}
      <a class="canon-login" href="/connexion" aria-current={current('/connexion')}>{t('nav.login')}</a>
    {/if}
  </div>
</header>
<nav class="canon-bottom" aria-label={t('nav.bottom')}>
  {#each items as item (item.href)}
    <a href={item.href} aria-current={current(item.href)}>{item.label}</a>
  {/each}
</nav>
<button class="canon-top" class:is-on={showTop} type="button" aria-label={t('nav.backtop')} onclick={toTop}>
  ↑
</button>
