<script lang="ts">
import { t } from '../i18n/index.js';
import type { CategoryItem } from '../lib/categories.js';
import { domainLetter } from '../lib/hub-view.js';
import { detailAllowed } from '../lib/plan-board.js';
import type { ReportRow } from '../lib/report-model.js';
import { checkHref, domainHref } from '../lib/report-route.js';

interface Props {
  kind: 'domaines' | 'constats';
  auditId: string;
  host: string;
  items: CategoryItem[];
  rows: ReportRow[];
  verified: boolean;
}

let { kind, auditId, host, items, rows, verified }: Props = $props();

/** Points à corriger lisibles, groupés par domaine, du plus grave au moins grave. */
const groups = $derived(
  items
    .filter((item) => detailAllowed(item.id, item.locked === true, verified))
    .map((item) => ({
      item,
      rows: rows
        .filter(
          (row) =>
            row.domain === item.id &&
            (row.catalogStatus === 'fail' || row.catalogStatus === 'warn'),
        )
        .sort((a, b) => b.severity - a.severity),
    }))
    .filter((group) => group.rows.length > 0),
);
const total = $derived(
  groups.reduce((sum, group) => sum + group.rows.length, 0),
);
</script>

<section class="rp-index" aria-labelledby="rp-index-h">
  <p class="rp-host">{host}</p>
  <h1 id="rp-index-h">{kind === 'domaines' ? t('rp.domaines.title') : t('rp.constats.title')}</h1>
  <p class="rp-lead">{kind === 'domaines' ? t('rp.domaines.lead') : t('rp.constats.lead')}</p>
  {#if kind === 'domaines'}
    <ul class="rp-list">
      {#each items as item (item.id)}
        {@const letter = domainLetter(item.score, item.locked === true)}
        <li>
          <a class="rp-row" href={domainHref(auditId, item.id)}>
            <span class="rp-txt"><b>{item.label}</b><span>{item.detail}</span></span>
            <span class="rp-mark">{item.locked ? t('rp.domaines.locked') : (letter ?? t('rp.domaines.untested'))}</span>
          </a>
        </li>
      {/each}
    </ul>
  {:else if total === 0}
    <p role="status">{t('rp.constats.empty')}</p>
  {:else}
    <p class="rp-count">{total === 1 ? t('rp.constats.one') : t('rp.constats.count', { n: total })}</p>
    {#each groups as group (group.item.id)}
      <h2 class="rp-group">{group.item.label}</h2>
      <ul class="rp-list">
        {#each group.rows as row (row.id)}
          <li><a class="rp-row" href={checkHref(auditId, row.checkId || row.id)}><span class="rp-txt"><b>{row.title}</b></span></a></li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>

<style>
  .rp-index {
    max-width: 48rem;
  }

  .rp-host {
    margin: 0 0 0.25rem;
    color: var(--muted, var(--ink-2));
    font: 600 0.9375rem / 1.4 ui-monospace, monospace;
  }

  h1 {
    margin: 0 0 0.5rem;
  }

  .rp-lead {
    margin: 0 0 1.5rem;
    color: var(--muted, var(--ink-2));
  }

  .rp-count {
    margin: 0 0 1rem;
    font-weight: 600;
  }

  .rp-group {
    margin: 2rem 0 0.75rem;
    font-size: 1.25rem;
  }

  .rp-list {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rp-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 2.75rem;
    padding: 0.75rem 1rem;
    border: 0.0625rem solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface, var(--surf));
    color: var(--text, var(--ink));
    text-decoration: none;
    transition: border-color 0.15s ease;
  }

  .rp-row:hover {
    border-color: var(--primary, var(--accent));
  }

  .rp-row:focus-visible {
    outline: 0.1875rem solid var(--primary, var(--focus));
    outline-offset: 0.0625rem;
  }

  .rp-txt {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .rp-txt span {
    color: var(--muted, var(--ink-2));
    font-size: 0.9375rem;
  }

  .rp-mark {
    flex: none;
    font-weight: 700;
    font-size: 0.875rem;
  }
</style>
