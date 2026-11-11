<script lang="ts">
import { t } from '../../i18n/index.js';
import LocaleSwitch from './LocaleSwitch.svelte';
import ThemeSwitch from './ThemeSwitch.svelte';

interface Link {
  href: string;
  label: string;
}

interface Props {
  pathname: string;
  loggedIn?: boolean;
  links?: Link[];
}

let { pathname, loggedIn = false, links }: Props = $props();

const items = $derived(
  links ?? [
    { href: '/', label: t('v6.nav.home') },
    { href: '/methode', label: t('v6.nav.method') },
    { href: '/sites', label: t('v6.nav.sites') },
    { href: '/pro', label: t('v6.nav.pricing') },
  ],
);

function current(href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
</script>

<header class="top">
  <div class="bar">
    <a class="v6-logo" href="/" aria-label={t('v6.nav.home')}>
      <img src="/v6/logo.svg" alt="" width="120" height="38" />
    </a>
    <nav class="nav" aria-label={t('v6.nav.label')}>
      {#each items as item (item.href)}
        <a href={item.href} aria-current={current(item.href) ? 'page' : undefined}>
          {item.label}
        </a>
      {/each}
    </nav>
    <div class="tools">
      <LocaleSwitch />
      <ThemeSwitch />
      <a class="login" href={loggedIn ? '/compte' : '/connexion'}>
        <svg aria-hidden="true"><use href="#i-user" /></svg>
        {loggedIn ? t('v6.account') : t('v6.login')}
      </a>
    </div>
  </div>
</header>
