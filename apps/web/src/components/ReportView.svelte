<script lang="ts">
import { onMount } from 'svelte';
import { formatNumber } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { recognizedStack } from '../lib/brief.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import {
  domainPlain,
  domainSentence,
  isKnownDomain,
  REPORT_DOMAINS,
} from '../lib/domains.js';
import { levelForStatus } from '../lib/findings.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import {
  type ActionStatus,
  badgeHref,
  detailHref,
  domainLetter,
  failureKind,
  hostLabel,
  isActionStatus,
  mergeApercu,
  planHref,
  priorityHref,
  type SeverityTone,
  severityTone,
  shareGesture,
  verifyHref,
} from '../lib/hub-view.js';
import { loginHref } from '../lib/nav.js';
import { formatRating } from '../lib/places-api.js';
import { pickPriorities } from '../lib/priorities.js';
import { progressLive } from '../lib/progress-live.js';
import { relaunchHref } from '../lib/relaunch.js';
import {
  markdownFilename,
  renderMarkdown,
  saveTextFile,
} from '../lib/report-export.js';
import {
  categoryItems,
  reportFindings,
  reportRows,
  reputationAside,
  scoredDomainCount,
} from '../lib/report-model.js';
import { levelForScore, levelLabel } from '../lib/score.js';
import { explainUntested } from '../lib/untested-cause.js';
import { verdictCopy } from '../lib/verdict.js';
import AuditOverlay from './AuditOverlay.svelte';
import FindingList from './FindingList.svelte';
import PreuveMentions from './PreuveMentions.svelte';
import ReportFooter from './ReportFooter.svelte';
import ShareSheet from './ShareSheet.svelte';
import UntestedCause from './UntestedCause.svelte';

interface Props {
  mode?: 'report' | 'domain' | 'detail' | 'plan' | 'badge';
}

let { mode = 'report' }: Props = $props();

let phase = $state<'loading' | 'message' | 'ready'>('loading');
let message = $state(t('report.loading'));
let payload = $state<AuditPayload | null>(null);
let domainId = $state('');
let checkId = $state('');
let shareOpen = $state(false);
let userId = $state('');
let statuses = $state<Record<string, ActionStatus>>({});

const items = $derived(
  payload
    ? categoryItems(payload.domains, payload.audit.id, payload.findings)
    : [],
);
const shown = $derived.by(() => {
  if (!payload) return [];
  const fixes = fixesFor(hostingOf(payload.audit.site.hosting));
  if (mode === 'domain') return reportFindings(payload, fixes, domainId);
  return reportFindings(payload, fixes);
});
const global = $derived(payload?.audit.globalScore ?? null);
const aside = $derived(payload ? reputationAside(payload) : null);
const verdict = $derived(verdictCopy(global, shown));
const reportRowList = $derived(
  payload
    ? reportRows(payload, fixesFor(hostingOf(payload.audit.site.hosting)))
    : [],
);
const priorities = $derived(pickPriorities(reportRowList, 10));
const siteVerified = $derived(payload?.audit.siteVerified !== false);
const host = $derived(payload ? hostLabel(payload.audit.site.url) : '');
const letter = $derived(domainLetter(global, !siteVerified));
const partialText = $derived(
  payload?.audit.partialLabel ??
    (siteVerified ? '' : t('report.partial', { n: scoredDomainCount(items) })),
);
const domainRow = $derived(items.find((item) => item.id === domainId));
const domainScore = $derived(
  payload?.domains.find((row) => row.domain === domainId)?.score ??
    domainRow?.score ??
    null,
);
const domainLocked = $derived(
  payload?.domains.find((row) => row.domain === domainId)?.locked === true ||
    domainRow?.locked === true,
);
const domainUntested = $derived.by(() => {
  if (!payload || mode !== 'domain' || domainScore !== null) return null;
  const row = payload.domains.find((item) => item.domain === domainId);
  return explainUntested({
    coverage: row?.coverage ?? null,
    findings: payload.findings.filter((item) => item.domain === domainId),
  });
});
const finishedNames = $derived(
  (payload?.domains ?? [])
    .filter((domain) => typeof domain.score === 'number')
    .map((domain) => domainPlain(domain.domain)),
);
const stamp = $derived.by(() => {
  const raw = payload?.audit.finishedAt ?? payload?.audit.createdAt;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
});

async function applyGate(source: AuditPayload): Promise<AuditPayload> {
  const supabase = browserClient();
  if (!supabase) return source;
  const { data, error } = await supabase.rpc('read_rapport_apercu', {
    p_audit_id: source.audit.id,
  });
  if (error || data == null) return source;
  return mergeApercu(source, data);
}

async function loadStatuses(siteId: string): Promise<void> {
  const supabase = browserClient();
  if (!supabase) return;
  const { data, error } = await supabase
    .from('action_plan_items')
    .select('check_id, status')
    .eq('site_id', siteId);
  if (error || !Array.isArray(data)) return;
  const next: Record<string, ActionStatus> = {};
  for (const row of data) {
    if (isActionStatus(row.status)) next[row.check_id] = row.status;
  }
  statuses = next;
}

async function onStatus(
  findingId: string,
  status: ActionStatus,
): Promise<void> {
  if (!payload || !userId) {
    statuses = { ...statuses, [findingId]: status };
    return;
  }
  const row =
    reportRowList.find((item) => item.checkId === findingId) ??
    reportRowList.find((item) => item.id === findingId);
  const domain = row?.domain;
  const key = row?.checkId ?? findingId;
  if (!domain) return;
  statuses = { ...statuses, [key]: status };
  const supabase = browserClient();
  if (!supabase) return;
  await supabase.from('action_plan_items').upsert(
    {
      user_id: userId,
      site_id: payload.audit.site.id,
      check_id: key,
      domain,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,site_id,check_id' },
  );
}

async function onShare(): Promise<void> {
  const coarse =
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(hover: none)').matches;
  const canShare = typeof navigator.share === 'function';
  if (shareGesture(coarse, canShare) && payload) {
    try {
      await navigator.share({
        title: t('hub.share'),
        url: `${location.origin}/rapport?id=${encodeURIComponent(payload.audit.id)}`,
      });
      return;
    } catch {
      shareOpen = true;
      return;
    }
  }
  shareOpen = true;
}

const badgeSnippet = $derived.by(() => {
  if (!payload || typeof location === 'undefined') return '';
  const mark = letter ?? '';
  return `<a href="${location.origin}/rapport?id=${payload.audit.id}">${t('brand.ui')} ${mark}</a>`;
});

const detailRows = $derived(
  mode === 'detail'
    ? reportRowList.filter(
        (row) => row.id === checkId || row.checkId === checkId,
      )
    : reportRowList,
);

function toneLabel(tone: SeverityTone): string {
  if (tone === 'crit') return t('hub.sev.crit');
  if (tone === 'fix') return t('hub.sev.fix');
  if (tone === 'check') return t('hub.sev.check');
  return t('hub.sev.minor');
}

function downloadMarkdown(event: MouseEvent): void {
  event.preventDefault();
  if (!payload) return;
  const file = markdownFilename(payload.audit.site.url, stamp);
  saveTextFile(
    file,
    renderMarkdown({
      url: payload.audit.site.url,
      at: stamp,
      methodVersion: payload.audit.methodVersion,
      globalScore: global,
      publicView: false,
      domains: items.map((item) => ({
        label: item.label,
        score: item.score,
        detail: item.detail,
        coverageNote: item.coverageNote,
        causes: item.causes
          ? {
              primary: item.causes.primary?.text ?? null,
              others: item.causes.others.map((line) => line.text),
              closing: item.causes.closing,
            }
          : null,
      })),
      findings: shown.map((finding) => ({
        title: finding.title,
        statusLabel: levelLabel(levelForStatus(finding.status)),
        statement: finding.why,
        limit: finding.limit ?? null,
      })),
    }),
  );
}

onMount(() => {
  void load();

  async function load(): Promise<void> {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    domainId = params.get('domaine') ?? '';
    checkId = params.get('check') ?? '';
    if (!id || (mode === 'domain' && !isKnownDomain(domainId))) {
      phase = 'message';
      message =
        mode === 'domain' ? t('report.domain.missing') : t('report.missing');
      return;
    }
    const session = await currentSession();
    if (session) userId = session.user.id;
    if (!session) {
      location.replace(loginHref(`${location.pathname}${location.search}`));
      return;
    }
    const result = await readAudit(session.access_token, id);
    if (!result.ok) {
      phase = 'message';
      message = result.status === 404 ? t('report.missing') : result.message;
      return;
    }
    const status = result.payload.audit.status;
    if (status === 'queued' || status === 'running') {
      phase = 'message';
      message = t('report.pending');
      payload = result.payload;
      return;
    }
    const gated = await applyGate(result.payload);
    payload = gated;
    phase = 'ready';
    void loadStatuses(gated.audit.site.id);
    queueMicrotask(() => {
      const hash = location.hash.replace(/^#/u, '');
      if (!hash) return;
      document.getElementById(decodeURIComponent(hash))?.scrollIntoView();
    });
  }
});
</script>

{#if phase === 'loading' || (payload && (payload.audit.status === 'queued' || payload.audit.status === 'running'))}
  <div class="reading">
    <AuditOverlay
      message={progressLive(payload?.audit.status ?? 'queued', finishedNames)}
    />
  </div>
{:else if phase === 'message'}
  <h1>{mode === 'domain' ? t('domain.heading') : t('report.heading')}</h1>
  <p role="status">{message}</p>
  {#if payload}
    <p>
      <a class="link-action" href={`/progression?id=${encodeURIComponent(payload.audit.id)}`}>{t('report.progress')}</a>
    </p>
  {:else}
    <p><a class="link-action" href="/sites">{t('nav.sites')}</a></p>
  {/if}
{:else if payload && payload.audit.status === 'failed'}
  <section class="fail-card" aria-labelledby="fail-title">
    <h1 id="fail-title">{t('hub.failed.title')}</h1>
    <p>{failureKind(payload.audit.error) === 'denied' ? t('hub.failed.denied') : failureKind(payload.audit.error) === 'down' ? t('hub.failed.down') : t('hub.failed.body')}</p>
    <p><a class="btn-primary" href={relaunchHref(payload.audit.site.id)}>{t('progress.retry')}</a></p>
  </section>
{:else if payload}
  <div class="reading">
    {#if mode === 'badge'}
      <p class="crumbs"><a href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('badge.back')}</a></p>
      <section class="plan-card">
        <p>{host}</p>
        <h1>{t('badge.title')}</h1>
        <p>{t('badge.lead')}</p>
        <p class="badge-preview"><span>{t('brand.ui')}</span><b>{letter ?? '–'}</b></p>
        <pre class="badge-code">{badgeSnippet}</pre>
      </section>
    {:else if mode === 'plan'}
      <section class="plan-card">
        <p class="crumbs"><a href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{host}</a></p>
        <h1>{t('hub.plan.title')}</h1>
        <p>{t('hub.plan.lead')}</p>
        <p>{t('plan.progress', { done: Object.values(statuses).filter((item) => item === 'done').length, total: priorities.length })}</p>
      </section>
      <FindingList
        findings={reportRowList.filter((row) => row.catalogStatus === 'fail' || row.catalogStatus === 'warn')}
        {statuses}
        {onStatus}
        detailHref={(id) => detailHref(payload.audit.id, id)}
      />
    {:else if mode === 'detail'}
      <p><a class="link-action" href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('domain.back')}</a></p>
      <FindingList
        findings={detailRows}
        {statuses}
        {onStatus}
      />
    {:else if mode === 'domain'}
      <p><a class="link-action" href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('domain.back')}</a></p>
      <nav aria-label={t('domain.nav')}>
        <ul class="domain-switch">
          {#each items as item (item.id)}
            <li>
              <a
                href={item.href}
                aria-current={item.id === domainId ? 'page' : undefined}
              >{item.label} <span>{item.locked ? t('domain.locked.badge') : domainLetter(item.score, false) ?? ''}</span></a>
            </li>
          {/each}
        </ul>
      </nav>
      <header class="note-card">
        <div class="rose" aria-hidden="true"><b>{domainLocked ? '–' : domainLetter(domainScore, false) ?? '–'}</b></div>
        <div>
          {#if domainLocked}
            <p class="pill-lock">{t('domain.locked.badge')}</p>
          {/if}
          <h1>{domainPlain(domainId)}</h1>
          {#if domainLocked}
            <p>{t('hub.lock.lead')}</p>
            <p>{t('hub.lock.why')}</p>
            <div class="lock-grid">
              <article><h2>{t('hub.lock.https')}</h2><p>{t('domain.locked.teaser')}</p></article>
              <article><h2>{t('hub.lock.hsts')}</h2><p>{t('domain.locked.teaser')}</p></article>
              <article><h2>{t('hub.lock.frame')}</h2><p>{t('domain.locked.teaser')}</p></article>
            </div>
            <p><a class="btn-primary" href={verifyHref(payload.audit.site.id)}>{t('domain.locked.cta')}</a></p>
          {:else}
            {#if domainLetter(domainScore, false)}
              <p>{t('report.grade.letter', { grade: domainLetter(domainScore, false) ?? 'C' })}</p>
            {/if}
            <p>{domainSentence(domainId, levelForScore(domainScore))}</p>
            {#if domainId === 'accessibilite'}
              <p>{t('hub.a11y')}</p>
            {/if}
          {/if}
        </div>
      </header>
      {#if domainUntested && !domainLocked}
        <UntestedCause coverageNote={domainUntested.coverageNote} causes={domainUntested.causes} />
      {/if}
      {#if !domainLocked}
        <h2 id="corrections">{t('section.findings')}</h2>
        <FindingList
          findings={shown}
          {statuses}
          {onStatus}
          detailHref={(id) => detailHref(payload.audit.id, id)}
        />
      {/if}
    {:else}
      <header class="hub-head">
        <div>
          <ol class="crumbs">
            <li><a href="/sites">{t('nav.sites')}</a></li>
            <li>{host}</li>
          </ol>
          <h1 class="hub-title">{t('hub.audit', { host })}</h1>
          {#if siteVerified}
            <p class="pill-ok">{t('hub.verified')}</p>
          {:else if partialText}
            <p class="pill-lock">{partialText}</p>
          {/if}
          <p>{verdict.detail}</p>
        </div>
        <div class="hub-actions">
          <button class="btn-ghost" type="button" onclick={onShare}>{t('hub.share')}</button>
          <a class="btn-ghost" href={badgeHref(payload.audit.id)}>{t('hub.badge')}</a>
          <a class="btn-ghost" href={relaunchHref(payload.audit.site.id)}>{t('progress.retry')}</a>
        </div>
      </header>
      <section class="note-card" aria-labelledby="t-note">
        <div class="rose" aria-hidden="true"><b>{letter ?? '–'}</b></div>
        <div>
          <h2 id="t-note">{t('hub.note')}</h2>
          {#if letter}
            <p>{t('report.grade.letter', { grade: letter })}</p>
            <p>{verdict.headline}</p>
          {:else}
            <p>{t('hub.note.missing')}</p>
          {/if}
          <p>{t('report.coverage', { scored: scoredDomainCount(items), total: REPORT_DOMAINS.length })}</p>
        </div>
      </section>
      <section aria-labelledby="t-prio">
        <div class="sec-h">
          <h2 id="t-prio">{t('hub.priorities')}</h2>
        </div>
        <ol class="prio">
          {#each priorities as item, index (item.id)}
            {@const row = reportRowList.find((entry) => entry.id === item.id)}
            {@const tone = severityTone(row?.severity ?? 1, row?.catalogStatus ?? 'warn')}
            <li>
              <a href={priorityHref(payload.audit.id, row?.domain ?? '', item.id)}>
                <span class="rank">{index + 1}</span>
                <span>{item.title}</span>
                <span class="sev sev-{tone}">{toneLabel(tone)}</span>
                <span>{domainPlain(row?.domain ?? '')}</span>
              </a>
            </li>
          {/each}
        </ol>
      </section>
      <section aria-labelledby="t-dom">
        <div class="sec-h">
          <h2 id="t-dom">{t('hub.domains')}</h2>
          <p>{t('hub.domains.hint')}</p>
        </div>
        <ul class="doms">
          {#each items as item (item.id)}
            <li>
              <a class="dom" href={item.href}>
                <span class="dom-name">{item.label}</span>
                <span class="dom-sum">{item.locked ? t('domain.locked.teaser') : item.detail}</span>
                {#if !item.locked && item.score !== null}
                  <span class="bar" aria-hidden="true"><i style={`--w:${Math.max(0, Math.min(100, item.score))}%`}></i></span>
                {/if}
                <span class="grade-chip grade-{(domainLetter(item.score, item.locked) ?? 'n').toLowerCase()}">
                  {item.locked ? t('domain.locked.badge') : domainLetter(item.score, false) ?? '–'}
                </span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
      <section class="brief-band" aria-labelledby="t-ai">
        <div>
          <h2 id="t-ai">{t('hub.brief.title')}</h2>
          <p>{t('hub.brief.lead')}</p>
        </div>
        <a class="btn-white" href={planHref(payload.audit.id)}>{t('hub.brief.cta')}</a>
      </section>
      {#if aside}
        <section class="plan-card">
          <h2>{t('domain.reputation.plain')}</h2>
          {#if aside.name}<p>{aside.name}</p>{/if}
          {#if aside.rating !== null}
            <p>{t('places.rating', { rating: formatRating(aside.rating) })}</p>
            <p>{t('places.count', { count: formatNumber(aside.reviewCount ?? 0) })}</p>
          {/if}
          <p>{domainSentence('reputation', aside.level)}</p>
        </section>
      {/if}
      <ShareSheet auditId={payload.audit.id} {host} open={shareOpen} onClose={() => { shareOpen = false; }} />
    {/if}
    <section class="plan-card">
      <h2 id="verification">{t('section.verify')}</h2>
      <details>
        <summary>{t('verify.how')}</summary>
        <p>{t('verify.lead')}</p>
        <p>{t('verify.pending')}</p>
        <p>{t('verify.id')}</p>
      </details>
      <p class="hub-actions">
        <a class="btn-ghost" href={`/rapport/${payload.audit.id}/imprimer`}>{t('print.link')}</a>
        <a class="btn-ghost" href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`} download={markdownFilename(payload.audit.site.url, stamp)} onclick={downloadMarkdown}>{t('export.markdown')}</a>
      </p>
      <PreuveMentions />
      <ReportFooter
        url={payload.audit.site.url}
        at={stamp}
        methodVersion={payload.audit.methodVersion}
        fingerprint={payload.audit.id}
        fingerprintKind="id"
        verifyHref={`/verifier/${payload.audit.id}`}
      />
    </section>
  </div>
{/if}

<style>
  .verdict {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-6) var(--space-7);
    align-items: center;
  }

  .detail {
    max-width: var(--line-length);
    margin-bottom: var(--space-3);
    font-size: var(--text-lg);
  }

  .grade {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2) var(--space-3);
    margin: 0 0 var(--space-2);
  }

  .grade-letter {
    font: 600 var(--text-lg) / 1 var(--font-text);
  }

  .grade-label {
    color: var(--ink-2);
  }

  .export-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  @media (max-width: 768px) {
    .verdict {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
