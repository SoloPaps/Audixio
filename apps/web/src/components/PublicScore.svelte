<script lang="ts">
import { isLockedDomain } from '@audigy/db';
import { onMount } from 'svelte';
import { type MessageKey, t } from '../i18n/index.js';
import { browserClient } from '../lib/browser-session.js';
import type { CategoryItem } from '../lib/categories.js';
import {
  domainPlain,
  domainSentence,
  domainTech,
  REPORT_DOMAINS,
} from '../lib/domains.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import { domainLetter, hostLabel } from '../lib/hub-view.js';
import { pickPriorities } from '../lib/priorities.js';
import {
  loadPublicScore,
  loadSharedScore,
  type PublicScoreView,
  payloadFromPublicView,
  publicGlobalDisplay,
  scoreBadgeSvg,
} from '../lib/public-score.js';
import {
  markdownFilename,
  renderMarkdown,
  saveTextFile,
} from '../lib/report-export.js';
import {
  partialPillText,
  categoryItems as reportCategoryItems,
  reportRows,
  scoredDomainCount,
} from '../lib/report-model.js';
import { type Level, levelForScore } from '../lib/score.js';
import { translate } from '../lib/translate.js';
import { publicCoverageNote } from '../lib/untested-cause.js';
import { verdictCopy } from '../lib/verdict.js';
import EmptyState from './EmptyState.svelte';
import HubView from './HubView.svelte';
import PreuveMentions from './PreuveMentions.svelte';
import ReportFooter from './ReportFooter.svelte';
import ScoreGauge from './ScoreGauge.svelte';

interface Props {
  mode?: 'public' | 'share';
}

let { mode = 'public' }: Props = $props();

const HEAD: Record<Level, MessageKey> = {
  good: 'verdict.good',
  improve: 'verdict.improve',
  problem: 'verdict.problem',
  untested: 'verdict.untested',
};

let phase = $state<'loading' | 'missing' | 'ready'>('loading');
let hasKey = $state(true);
let failure = $state('');
let view = $state<PublicScoreView | null>(null);

const items = $derived(view ? categoryItems(view) : []);
// Libellé du bandeau selon le type de lien ouvert : public ou équipe.
// Lien fermé : type inconnu, libellé neutre.
const bannerKey = $derived<MessageKey>(
  phase === 'missing'
    ? 'share.banner.plain'
    : view?.access === 'public'
      ? 'share.banner.public'
      : 'share.banner',
);
const stamp = $derived.by(() => {
  const raw = view?.finishedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
});
const openTotal = $derived(
  REPORT_DOMAINS.filter((id) => !isLockedDomain(id)).length,
);
const scored = $derived(
  items.filter(
    (item) =>
      (REPORT_DOMAINS as readonly string[]).includes(item.id) &&
      !isLockedDomain(item.id) &&
      item.score !== null,
  ).length,
);
const globalDisplay = $derived(
  publicGlobalDisplay(view?.globalScore ?? null, scored, openTotal),
);
const verified = $derived(view?.siteVerified === true);
const payload = $derived(view ? payloadFromPublicView(view) : null);
const reportItems = $derived(
  payload
    ? reportCategoryItems(payload.domains, payload.audit.id, payload.findings)
    : [],
);
const reportRowList = $derived(
  payload
    ? reportRows(payload, fixesFor(hostingOf(payload.audit.site.hosting)))
    : [],
);
const priorities = $derived(pickPriorities(reportRowList, 10));
const host = $derived(view ? hostLabel(view.url) : '');
const letter = $derived(domainLetter(view?.globalScore ?? null, !verified));
const headline = $derived(
  verdictCopy(view?.globalScore ?? null, reportRowList).headline,
);
const partialText = $derived(
  partialPillText(null, verified, scoredDomainCount(reportItems)),
);

function categoryItems(score: PublicScoreView): CategoryItem[] {
  return score.domains.map((row) => {
    const level = levelForScore(row.score);
    return {
      id: row.domain,
      label: domainPlain(row.domain),
      technical: domainTech(row.domain),
      detail: domainSentence(row.domain, level),
      score: row.score,
      coverageNote:
        row.score === null ? publicCoverageNote(row.coverage) : null,
    };
  });
}

function segment(): string {
  const parts = location.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[1] ?? '');
}

function downloadMarkdown(event: MouseEvent): void {
  event.preventDefault();
  if (!view) return;
  const at = stamp;
  saveTextFile(
    markdownFilename(view.url, at ?? new Date()),
    renderMarkdown({
      url: view.url,
      at,
      methodVersion: view.methodVersion,
      globalScore: view.globalScore,
      publicView: true,
      domains: items.map((item) => ({
        label: item.label,
        score: item.score,
        detail: item.detail,
        coverageNote: item.coverageNote,
        causes: null,
      })),
      findings: [],
      securityHeading: t('score.security.title'),
      securityLines: [t('score.security.hidden')],
    }),
  );
}

function download(): void {
  if (!view) return;
  const svg = scoreBadgeSvg(view.label, view.globalScore);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audigy-score.svg';
  link.click();
  URL.revokeObjectURL(url);
}

onMount(() => {
  void load();

  async function load(): Promise<void> {
    const key = segment();
    hasKey = key !== '';
    try {
      const row =
        mode === 'share'
          ? await loadSharedScore(browserClient(), key)
          : await loadPublicScore(browserClient(), key);
      view = row;
      phase = row ? 'ready' : 'missing';
    } catch {
      view = null;
      failure = t('score.public.error');
      phase = 'missing';
    }
  }
});
</script>

<div class="reading">
{#if mode === 'share' && phase !== 'loading' && (phase !== 'missing' || hasKey)}
  <p class="share-banner">{t(bannerKey)}</p>
{/if}
{#if phase === 'loading'}
  <section class="glass glass-module">
    <div class="glass-plate">
      <h1>{mode === 'share' ? t('share.heading') : t('score.public.heading')}</h1>
      <p role="status">{t('score.public.loading')}</p>
    </div>
  </section>
{:else if failure}
  <section class="glass glass-module">
    <div class="glass-plate">
      <h1>{mode === 'share' ? t('share.heading') : t('score.public.heading')}</h1>
      <p role="status">{failure}</p>
    </div>
  </section>
{:else if phase === 'missing' || !view}
  <EmptyState
    title={mode === 'share'
      ? hasKey
        ? t('share.missing.title')
        : t('share.none.title')
      : t('score.public.missing.title')}
    message={mode === 'share'
      ? hasKey
        ? t('share.missing')
        : t('share.none')
      : t('score.public.missing')}
  />
{:else}
  <section class="glass glass-module">
    <div class="glass-plate">
      <header class="verdict">
        {#if globalDisplay !== 'deferred'}
          <ScoreGauge domain={t('domain.global')} score={view.globalScore} size="hero" />
        {/if}
        <div>
          <p class="kicker">{view.url}</p>
          <h1>{globalDisplay === 'deferred' ? t('score.public.deferred') : t(HEAD[levelForScore(view.globalScore)])}</h1>
          {#if !verified}<p class="detail">{t('score.public.lead')}</p>{/if}
          <p class="hint">
            {t('report.coverage', {
              scored: verified ? reportItems.filter((item) => item.score !== null).length : scored,
              total: verified ? reportItems.length : openTotal,
            })}
          </p>
        </div>
      </header>
    </div>
  </section>

  {#if view.domains.length === 0}
    <EmptyState message={t('score.public.empty')} />
  {:else if payload}
    <div class="wrap public-hub">
      <HubView
        {payload}
        items={reportItems}
        rows={reportRowList}
        {priorities}
        {host}
        {letter}
        {verified}
        {partialText}
        {headline}
        stamp={stamp ?? new Date()}
        guest={true}
        publicLink={true}
      />
    </div>
  {/if}

  <section class="glass glass-module">
    <div class="glass-plate">
      <h2>{t('score.security.title')}</h2>
      {#if view.access === 'team' && view.securityDetails.length > 0}
        <ul>
          {#each view.securityDetails as row (row.checkId)}
            <li>{translate(row.messageKey) ?? row.checkId}</li>
          {/each}
        </ul>
      {:else if verified && (view.findings?.length ?? 0) > 0}
        <ul>
          {#each view.findings ?? [] as row (row.checkId)}
            <li>{translate(row.messageKey) ?? row.checkId}</li>
          {/each}
        </ul>
      {:else}
        <p>{t('score.security.hidden')}</p>
      {/if}
      {#if view.access === 'team' && view.briefText}
        <p class="prose">{view.briefText}</p>
      {/if}
      <p class="export-links">
        <button type="button" class="button button-secondary" onclick={download}>
          {t('sites.badge')}
        </button>
        {#if view.domains.length > 0}
          <a
            class="link-action"
            href={location.pathname}
            download={markdownFilename(view.url, stamp ?? new Date())}
            onclick={downloadMarkdown}
          >{t('export.markdown')}</a>
        {/if}
      </p>
      <p class="hint">{t('sites.badge.hint')}</p>
    </div>
  </section>

  <section class="glass glass-module">
    <div class="glass-plate">
      <h2>{t('score.public.optout.title')}</h2>
      <p class="prose">{t('score.public.optout.lead')}</p>
      <p>
        <a class="link-action" href="/connexion">{t('score.public.optout.action')}</a>
      </p>
    </div>
  </section>

  {#if stamp && view.methodVersion && view.auditId}
    <section class="glass glass-module">
      <div class="glass-plate">
        <h2 id="verification">{t('section.verify')}</h2>
        <PreuveMentions />
        <ReportFooter
          url={view.url}
          at={stamp}
          methodVersion={view.methodVersion}
          fingerprint={view.auditId}
          fingerprintKind="id"
          verifyHref={`/verifier/${view.auditId}`}
        />
      </div>
    </section>
  {:else}
    <EmptyState message={t('score.public.empty')} />
  {/if}
{/if}
</div>

<style>
  .verdict {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-6) var(--space-7);
    align-items: center;
    padding-bottom: var(--space-6);
    border-bottom: var(--border) solid var(--line);
  }

  .detail {
    max-width: var(--line-length);
    margin-bottom: var(--space-3);
    font-size: var(--text-lg);
  }

  .export-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  @media (max-width: 768px) {
    .verdict {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
