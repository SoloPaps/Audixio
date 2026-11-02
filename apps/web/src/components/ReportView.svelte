<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { domainPlain, isKnownDomain } from '../lib/domains.js';
import { levelForStatus } from '../lib/findings.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import {
  type ActionStatus,
  detailHref,
  domainLetter,
  failureKind,
  hostLabel,
  isActionStatus,
  mergeApercu,
} from '../lib/hub-view.js';
import { loginHref } from '../lib/nav.js';
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
  scoredDomainCount,
} from '../lib/report-model.js';
import { levelLabel } from '../lib/score.js';
import { explainUntested } from '../lib/untested-cause.js';
import { verdictCopy } from '../lib/verdict.js';
import AuditOverlay from './AuditOverlay.svelte';
import DomainLockedView from './DomainLockedView.svelte';
import DomainView from './DomainView.svelte';
import FindingList from './FindingList.svelte';
import HubView from './HubView.svelte';
import PreuveMentions from './PreuveMentions.svelte';
import ReportFooter from './ReportFooter.svelte';
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
      {#if domainLocked}
        <DomainLockedView auditId={payload.audit.id} siteId={payload.audit.site.id} {domainId} {host} />
      {:else}
        {#if domainUntested}
          <UntestedCause coverageNote={domainUntested.coverageNote} causes={domainUntested.causes} />
        {/if}
        <DomainView
          auditId={payload.audit.id}
          {domainId}
          {host}
          verified={siteVerified}
          score={domainScore}
          findings={shown}
          {items}
          url={payload.audit.site.url}
          {stamp}
        />
      {/if}
    {:else if mode === 'report'}
      <HubView
        {payload}
        {items}
        rows={reportRowList}
        {priorities}
        {host}
        {letter}
        verified={siteVerified}
        {partialText}
        headline={verdict.headline}
        {stamp}
      />
    {/if}
    {#if mode === 'plan'}
      <section class="plan-card verify-card">
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
    {/if}
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
