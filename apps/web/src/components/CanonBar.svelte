<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/index.js';
  import { storedSessionPresent } from '../lib/auth-storage.js';

  interface Props {
    pathname: string;
    initial?: 'system' | 'light' | 'dark';
  }

  let { pathname }: Props = $props();
  let loggedIn = $state(false);
  let open = $state(false);
  let showTop = $state(false);
  let locale = $state<'fr' | 'en'>('fr');

  function normalize(path: string): string {
    if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
    return path;
  }

  const here = $derived(normalize(pathname));

  function current(href: string): 'page' | undefined {
    if (href === '/') return here === '/' ? 'page' : undefined;
    return here === href || here.startsWith(`${href}/`) ? 'page' : undefined;
  }

  const items = [
    { href: '/', label: t('nav.home') },
    { href: '/methode', label: t('nav.method') },
    { href: '/sites', label: t('nav.sites.long') },
    { href: '/pro', label: t('nav.pricing') },
  ];

  function onScroll(): void {
    showTop = window.scrollY > window.innerHeight * 0.9;
  }

  function toTop(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  async function setLocale(next: 'fr' | 'en'): Promise<void> {
    if (next === locale) return;
    try {
      if (next === 'en' && !localStorage.getItem('audigy-en')) {
        const res = await fetch('/dictionnaire-en.json');
        if (!res.ok) return;
        localStorage.setItem('audigy-en', await res.text());
      }
      localStorage.setItem('audigy-locale', next);
      location.reload();
    } catch {
      locale = 'fr';
    }
  }

  onMount(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    loggedIn = storedSessionPresent();
    if (localStorage.getItem('audigy-locale') === 'en') locale = 'en';
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<header class="axn" class:is-open={open} id="top">
  <div class="axn-bar">
    <a class="axn-logo" href="/" aria-label={t('brand.ui')}>
      <img class="axn-logo-d" src="/marque/logo-pc.svg" alt="" width="107" height="34" />
      <img class="axn-logo-m" src="/marque/logo-mobile.svg" alt="" width="36" height="36" />
    </a>
    <nav aria-label={t('nav.main')}>
      <ul class="axn-links">
        {#each items as item (item.href)}
          <li><a href={item.href} aria-current={current(item.href)}>{item.label}</a></li>
        {/each}
      </ul>
    </nav>
    <div class="axn-tools">
      <div class="axn-lang" role="group" aria-label={t('locale.label')}>
        <button type="button" lang="fr" aria-current={locale === 'fr' ? 'true' : undefined} onclick={() => setLocale('fr')}>FR</button>
        <button type="button" lang="en" aria-label="EN — English" aria-current={locale === 'en' ? 'true' : undefined} onclick={() => setLocale('en')}>EN</button>
      </div>
      <button class="axn-theme" type="button" aria-label={t('theme.light')} aria-pressed="true">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>
      </button>
      {#if loggedIn}
        <a class="axn-cta" href="/compte" aria-current={current('/compte')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
          <span>{t('nav.account')}</span>
        </a>
      {:else}
        <a class="axn-cta" href="/connexion">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
          <span>{t('nav.login')}</span>
        </a>
      {/if}
    </div>
    <button
      class="axn-burger"
      type="button"
      aria-expanded={open}
      aria-controls="axn-menu"
      aria-label={open ? t('nav.close') : t('nav.menu')}
      onclick={() => { open = !open; }}
    ><i aria-hidden="true"><b></b><b></b><b></b></i></button>
  </div>
  <button class="axn-scrim" type="button" aria-label={t('nav.close')} onclick={() => { open = false; }}></button>
  <div class="axn-sheet" id="axn-menu" role="dialog" aria-modal="true" aria-label={t('nav.menu')} inert={!open}>
    <nav aria-label={t('nav.bottom')}>
      <ul>
        {#each items as item, index (item.href)}
          <li style={`--i:${index}`}><a href={item.href} aria-current={current(item.href)}>{item.label}</a></li>
        {/each}
      </ul>
    </nav>
  </div>
</header>
<button class="axn-top" class:is-on={showTop} type="button" aria-label={t('nav.backtop')} onclick={toTop}>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>
