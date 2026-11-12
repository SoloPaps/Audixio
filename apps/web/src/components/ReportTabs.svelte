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
</script>

<nav class="rp-tabs" aria-label={t('rp.tabs.label')}>
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
    border-bottom: 0.1875rem solid transparent;
    color: var(--muted, var(--ink-2));
    font: 600 0.9375rem / 1.2 inherit;
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.15s ease;
  }

  a:hover {
    color: var(--text, var(--ink));
  }

  a[aria-current='page'] {
    border-bottom-color: var(--primary, var(--accent));
    color: var(--text, var(--ink));
  }

  a:focus-visible {
    outline: 0.1875rem solid var(--primary, var(--focus));
    outline-offset: calc(-1 * 0.1875rem);
  }
</style>
