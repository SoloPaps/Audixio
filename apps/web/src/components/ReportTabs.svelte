<script lang="ts">
import { t } from '../i18n/index.js';
import { type ReportTab, reportHref } from '../lib/report-route.js';

interface Props {
  auditId: string;
  current: ReportTab;
}

let { auditId, current }: Props = $props();

const tabs = [
  ['resume', 'rp.tab.resume'],
  ['domaines', 'rp.tab.domaines'],
  ['constats', 'rp.tab.constats'],
  ['plan', 'rp.tab.plan'],
  ['brief', 'rp.tab.brief'],
  ['imprimer', 'rp.tab.imprimer'],
] as const;

let nav: HTMLElement | undefined = $state();

/* Sur téléphone, la barre défile : l’onglet courant est ramené dans la vue. */
$effect(() => {
  const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
  nav.scrollLeft = Math.max(
    0,
    active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2,
  );
});
</script>

<nav class="rp-tabs" bind:this={nav} aria-label={t('rp.tabs.label')}>
  <ul>
    {#each tabs as [tab, label] (tab)}
      <li><a href={reportHref(auditId, tab)} aria-current={tab === current ? 'page' : undefined}>{t(label)}</a></li>
    {/each}
  </ul>
</nav>

<style>
  .rp-tabs {
    max-width: 100%;
    margin: 0 0 1.5rem;
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 0.0625rem solid var(--line);
  }

  .rp-tabs::-webkit-scrollbar {
    display: none;
  }

  ul {
    display: flex;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    flex: none;
  }

  a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    color: var(--ink-2);
    font: 600 0.9375rem / 1.2 inherit;
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.15s ease;
  }

  a:hover {
    color: var(--ink);
  }

  a {
    position: relative;
  }

  a::after {
    content: '';
    position: absolute;
    right: 0.75rem;
    bottom: 0;
    left: 0.75rem;
    height: 0.1875rem;
    border-radius: 0.125rem;
    background: var(--beam);
    transform: scaleX(0);
    transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  a:hover::after {
    transform: scaleX(0.4);
  }

  a[aria-current='page'] {
    color: var(--ink);
  }

  a[aria-current='page']::after {
    transform: scaleX(1);
    animation: rp-tab-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @keyframes rp-tab-in {
    from {
      transform: scaleX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    a,
    a::after {
      transition: none;
      animation: none;
    }
  }

  a:focus-visible {
    outline: 0.1875rem solid var(--focus);
    outline-offset: calc(-1 * 0.1875rem);
  }
</style>
