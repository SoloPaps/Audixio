<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { domainPlain, isKnownDomain } from '../lib/domains.js';
import { levelForStatus } from '../lib/findings.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import { readGuestAudit } from '../lib/guest-store.js';
import {
  type ActionStatus,
  domainLetter,
  failureKind,
  hostLabel,
  isActionStatus,
  mergeApercu,
} from '../lib/hub-view.js';
import { loginHref } from '../lib/nav.js';
import { detailAllowed } from '../lib/plan-board.js';
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
import BadgeView from './BadgeView.svelte';
import BriefView from './BriefView.svelte';
import ConstatView from './ConstatView.svelte';
import DomainLockedView from './DomainLockedView.svelte';
import DomainView from './DomainView.svelte';
import HubView from './HubView.svelte';
import PlanView from './PlanView.svelte';
import UntestedCause from './UntestedCause.svelte';

interface Props {
  mode?: 'report' | 'domain' | 'detail' | 'plan' | 'badge' | 'brief';
}

let { mode = 'report' }: Props = $props();

let phase = $state<'loading' | 'message' | 'ready' | 'brief-gate'>('loading');
let message = $state(t('report.loading'));
let payload = $state<AuditPayload | null>(null);
let domainId = $state('');
let checkId = $state('');
let userId = $state('');
let guest = $state(false);
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
    if (!session && mode === 'brief') {
      phase = 'brief-gate';
      return;
    }
    if (!session) {
      const stored = id ? readGuestAudit(id) : null;
      if (!stored) {
        location.replace(loginHref(`${location.pathname}${location.search}`));
        return;
      }
      guest = true;
      payload = stored;
      phase = 'ready';
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
  {#if mode === 'badge'}<main id="contenu" hidden></main>{/if}
  <div class="reading">
    <AuditOverlay
      message={progressLive(payload?.audit.status ?? 'queued', finishedNames)}
    />
  </div>
{:else if phase === 'brief-gate'}
  <h1>{t('guest.gate.title')}</h1>
  <p role="status">{t('guest.gate.lead')}</p>
  <p class="page-links">
    <a class="gg-btn" href="/connexion">{t('guest.gate.login')}</a>
    <a class="gg-btn gg-btn-main" href="/inscription">{t('guest.gate.signup')}</a>
  </p>
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
    <p><a class="btn-primary" href={relaunchHref(payload.audit.site.id, payload.audit.site.url)}>{t('progress.retry')}</a></p>
  </section>
{:else if payload && mode === 'badge'}
  <BadgeView
    auditId={payload.audit.id}
    {host}
    verified={siteVerified}
    score={global}
  />
{:else if payload}
  <div class="reading">
    {#if mode === 'plan'}
      <PlanView
        auditId={payload.audit.id}
        {host}
        rows={reportRowList}
        {statuses}
        {onStatus}
        verified={siteVerified}
        locked={new Set(items.filter((item) => item.locked).map((item) => item.id))}
        onDownload={downloadMarkdown}
        downloadName={markdownFilename(payload.audit.site.url, stamp)}
      />
    {:else if mode === 'brief'}
      <BriefView
        auditId={payload.audit.id}
        {host}
        url={payload.audit.site.url}
        {stamp}
        verified={siteVerified}
        {items}
        rows={reportRowList}
      />
    {:else if mode === 'detail'}
      {#if detailRows[0]}
        <ConstatView
          auditId={payload.audit.id}
          {host}
          verified={siteVerified}
          row={detailRows[0]}
          siblings={reportRowList.filter((row) => row.domain === detailRows[0]?.domain && (row.catalogStatus === 'fail' || row.catalogStatus === 'warn') && detailAllowed(row.domain ?? '', items.find((item) => item.id === row.domain)?.locked === true, siteVerified))}
          allowed={detailAllowed(detailRows[0].domain ?? '', items.find((item) => item.id === detailRows[0]?.domain)?.locked === true, siteVerified)}
        />
      {:else}
        <h1>{t('hub.detail')}</h1>
        <p role="status">{t('constat.missing')}</p>
      {/if}
    {:else if mode === 'domain'}
      {#if domainLocked}
        <DomainLockedView auditId={payload.audit.id} siteId={payload.audit.site.id} {domainId} {host} {items} />
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
        {guest}
      />
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
