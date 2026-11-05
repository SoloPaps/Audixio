<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { revealAll } from '../lib/motion.js';
import { loginHref } from '../lib/nav.js';
import { buildPdfReport, type PdfReport } from '../lib/pdf-report.js';
import { printPriorityTitle } from '../lib/print-priority.js';
import { printAuditId } from '../lib/print-proof.js';

const scales = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

let phase = $state<'loading' | 'message' | 'ready'>('loading');
let message = $state(t('report.loading'));
let needLogin = $state(false);
let payload = $state<AuditPayload | null>(null);
let root = $state<HTMLElement | null>(null);

const view = $derived<PdfReport | null>(
  payload ? buildPdfReport(payload) : null,
);
const reportHref = $derived(
  payload ? `/rapport?id=${encodeURIComponent(payload.audit.id)}` : '/sites',
);

$effect(() => {
  if (phase !== 'ready' || !root) return;
  const stop = revealAll(root);
  const bar = root.querySelector<HTMLElement>('.progress');
  const onScroll = (): void => {
    if (!bar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty(
      '--p',
      max > 0 ? String(Math.min(1, window.scrollY / max)) : '0',
    );
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => {
    stop();
    window.removeEventListener('scroll', onScroll);
  };
});

onMount(() => {
  void load();
});

async function load(): Promise<void> {
  const auditId = printAuditId(location.pathname, location.search) ?? '';
  if (auditId === '') {
    phase = 'message';
    message = t('report.missing');
    return;
  }
  const session = await currentSession();
  if (!session) {
    phase = 'message';
    needLogin = true;
    message = t('print.login');
    return;
  }
  const result = await readAudit(session.access_token, auditId);
  if (!result.ok) {
    phase = 'message';
    message = result.status === 404 ? t('report.missing') : result.message;
    return;
  }
  const status = result.payload.audit.status;
  if (status === 'queued' || status === 'running') {
    phase = 'message';
    message = t('report.pending');
    return;
  }
  payload = result.payload;
  phase = 'ready';
}

function onPrint(): void {
  root?.querySelectorAll('.rv').forEach((node) => {
    node.classList.add('in');
  });
  window.print();
}
</script>

<main id="contenu" tabindex="-1" bind:this={root}>
  {#if phase === 'loading'}
    <p role="status" aria-live="polite">{message}</p>
  {:else if phase === 'message'}
    <section class="session-wall" aria-labelledby="print-message-h">
      <h1 id="print-message-h">{t('print.heading')}</h1>
      <p role="status">{message}</p>
      {#if needLogin}
        <p class="session-acts">
          <a class="btn btn-primary" href={loginHref(`${location.pathname}${location.search}`)}>{t('nav.login')}</a>
        </p>
      {:else}
        <p class="session-acts"><a class="btn btn-ghost" href="/sites">{t('nav.sites.long')}</a></p>
      {/if}
    </section>
  {:else if view && payload}
    <div class="progress" aria-hidden="true"></div>
    <nav class="crumbs" aria-label={t('nav.pages')}>
      <ol>
        <li><a href="/sites">{t('nav.sites.long')}</a></li>
        <li><a href={reportHref}>{view.host}</a></li>
        <li><span aria-current="page">{t('pdf.crumb')}</span></li>
      </ol>
    </nav>
    <h1 class="sr-only">{t('pdf.h1', { host: view.host })}</h1>
    <div class="tb rv" role="region" aria-label={t('pdf.preview')}>
      <p>{t('pdf.preview')}</p>
      <div class="acts">
        <a class="btn btn-ghost" href={reportHref}>{t('pdf.back')}</a>
        <button class="btn btn-primary" type="button" id="printBtn" onclick={onPrint}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg>
          {t('pdf.print')}
        </button>
      </div>
    </div>
    <div class="sheets">
      <article class="sheet rv" style="--i:0" aria-label={t('pdf.pager', { page: 1 })}>
        <div class="cov-top">
          <img src="/marque/logo-pc.svg" alt={t('pdf.brand')} width="107" height="34" />
          <span class="cov-tag">{t('pdf.tag')}</span>
        </div>
        <div class="cov-mid">
          <p class="kicker">{t('pdf.kicker.cover')}</p>
          <p class="dom">{view.host}</p>
          <h2 class="cov-h">{t('pdf.cover')}</h2>
          <div class="bigg">
            {#if view.grade}
              <span class={`gr big gr-${view.grade.toLowerCase()}`} aria-label={t('pdf.grade.letter', { grade: view.grade })}>{view.grade}</span>
            {:else}
              <span class="gr big gr-none" aria-label={t('pdf.band.none')}>–</span>
            {/if}
            <div>
              <strong>{t(`pdf.band.${view.grade ?? 'none'}`)}</strong>
              <p>{t(`pdf.hint.${view.grade ?? 'none'}`)}</p>
            </div>
          </div>
        </div>
        <dl class="meta">
          <div>
            <dt>{t('pdf.meta.date')}</dt>
            <dd><time datetime={view.dateTime}>{view.dateLabel}</time></dd>
          </div>
          <div>
            <dt>{t('pdf.meta.owner')}</dt>
            <dd>{view.verified ? t('pdf.owner.yes') : t('pdf.owner.no')}</dd>
          </div>
          <div>
            <dt>{t('pdf.meta.crit')}</dt>
            <dd>{view.critical}</dd>
          </div>
        </dl>
        <div class="pf">
          <span>{t('pdf.foot', { host: view.host, date: view.dateLabel })}</span>
          <span>{t('pdf.pager', { page: 1 })}</span>
        </div>
      </article>
      <article class="sheet rv" style="--i:1" aria-label={t('pdf.pager', { page: 2 })}>
        <p class="kicker">{t('pdf.prio.kicker')}</p>
        <h2 class="sh">{printPriorityTitle(view.priorities.length, t('pdf.prio.title'), t('pdf.prio.empty'))}</h2>
        <p class="lede muted">{t('pdf.prio.lede')}</p>
        {#if view.priorities.length === 0}
          <p>{t('pdf.prio.empty')}</p>
        {:else}
          <ol class="pri">
            {#each view.priorities as row, index (index)}
              <li>
                <div>
                  <h3>{row.title} <span class={`badge b-${row.tone}`}>{t(`pdf.badge.${row.tone}`)}</span></h3>
                  <p>{row.detail}</p>
                </div>
              </li>
            {/each}
          </ol>
        {/if}
        <div class="pf">
          <span>{t('pdf.foot', { host: view.host, date: view.dateLabel })}</span>
          <span>{t('pdf.pager', { page: 2 })}</span>
        </div>
      </article>
      <article class="sheet rv" style="--i:2" aria-label={t('pdf.pager', { page: 3 })}>
        <p class="kicker">{t('pdf.dom.kicker')}</p>
        <h2 class="sh">{t('pdf.dom.title')}</h2>
        <table class="tbl">
          <caption class="sr-only">{t('pdf.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('pdf.col.domain')}</th>
              <th scope="col">{t('pdf.col.grade')}</th>
              <th scope="col" class="hide-s">{t('pdf.col.note')}</th>
              <th scope="col">{t('pdf.col.open')}</th>
            </tr>
          </thead>
          <tbody>
            {#each view.domains as row (row.id)}
              <tr>
                <td><strong>{row.label}</strong></td>
                <td>
                  {#if row.locked || !row.grade}
                    <span class="badge b-nt">{t('pdf.locked')}</span>
                  {:else}
                    <span class={`gr gr-${row.grade.toLowerCase()}`} aria-label={t('pdf.grade.letter', { grade: row.grade })}>{row.grade}</span>
                  {/if}
                </td>
                <td class="hide-s">{row.locked ? t('pdf.locked') : row.note}</td>
                <td>{row.open}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <div class="leg" aria-label={t('pdf.scale.label')}>
          {#each scales as grade (grade)}
            <span><span class={`gr gr-${grade.toLowerCase()}`} aria-label={t('pdf.grade.letter', { grade })}>{grade}</span> {t(`pdf.scale.${grade}`)}</span>
          {/each}
        </div>
        <p class="muted method">{t('pdf.method')}</p>
        <div class="pf">
          <span>{t('pdf.foot', { host: view.host, date: view.dateLabel })}</span>
          <span>{t('pdf.pager', { page: 3 })}</span>
        </div>
      </article>
    </div>
    <section class="after" aria-labelledby="t-after">
      <h2 id="t-after" class="h2">{t('pdf.more')}</h2>
      <ul class="lk-grid">
        <li>
          <a class="lk" href={`/brief?id=${encodeURIComponent(payload.audit.id)}`}>
            <span class="lk-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg></span>
            <span class="lk-tx"><span class="lk-t">{t('pdf.brief')}</span><span class="lk-d">{t('pdf.brief.d')}</span></span>
            <svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </li>
        <li>
          <a class="lk" href={`/plan?id=${encodeURIComponent(payload.audit.id)}`}>
            <span class="lk-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg></span>
            <span class="lk-tx"><span class="lk-t">{t('pdf.plan')}</span><span class="lk-d">{t('pdf.plan.d')}</span></span>
            <svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </li>
        <li>
          <a class="lk" href={`/badge?id=${encodeURIComponent(payload.audit.id)}`}>
            <span class="lk-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg></span>
            <span class="lk-tx"><span class="lk-t">{t('pdf.badge')}</span><span class="lk-d">{t('pdf.badge.d')}</span></span>
            <svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </li>
      </ul>
    </section>
  {/if}
</main>
