<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { domainPager } from '../lib/domains.js';
import {
  type ActionStatus,
  briefHref,
  detailHref,
  type SeverityTone,
  severityTone,
} from '../lib/hub-view.js';
import { calm, revealAll, say } from '../lib/motion.js';
import {
  compareTasks,
  detailAllowed,
  effortBand,
  quadrant,
} from '../lib/plan-board.js';
import type { ReportRow } from '../lib/report-model.js';
import { domainHref, reportHref } from '../lib/report-route.js';

interface Props {
  auditId: string;
  host: string;
  rows: ReportRow[];
  statuses: Record<string, ActionStatus>;
  onStatus: (findingId: string, status: ActionStatus) => Promise<void>;
  verified: boolean;
  locked: ReadonlySet<string>;
  onDownload: (event: MouseEvent) => void;
  downloadName: string;
}

let {
  auditId,
  host,
  rows,
  statuses,
  onStatus,
  verified,
  locked,
  onDownload,
  downloadName,
}: Props = $props();

type Filter = 'all' | 'a_faire' | 'en_cours' | 'fait';
let filter = $state<Filter>('all');
let sort = $state<'prio' | 'eff'>('prio');
let root = $state<HTMLElement | null>(null);

const tasks = $derived(
  rows
    .filter(
      (row) =>
        (row.catalogStatus === 'fail' || row.catalogStatus === 'warn') &&
        detailAllowed(row.domain ?? '', locked.has(row.domain ?? ''), verified),
    )
    .map((row) => {
      const status = statuses[row.checkId] ?? 'todo';
      const effort = effortBand(row.minutes);
      const tone = severityTone(row.severity, row.catalogStatus);
      return { row, status, effort, tone, impact: row.impact };
    }),
);

const ordered = $derived([...tasks].sort((a, b) => compareTasks(sort, a, b)));

const visible = $derived(
  ordered.filter((task) => filter === 'all' || uiOf(task.status) === filter),
);

const counts = $derived({
  todo: tasks.filter((task) => task.status === 'todo').length,
  doing: tasks.filter((task) => task.status === 'doing').length,
  done: tasks.filter((task) => task.status === 'done').length,
});

const matrix = $derived.by(() => {
  const bins = [0, 0, 0, 0];
  for (const task of tasks) {
    const bin = quadrant(task.impact, task.effort, task.status);
    if (bin !== null) bins[bin] += 1;
  }
  return bins;
});

const progress = $derived(
  tasks.length === 0 ? 0 : Math.round((counts.done / tasks.length) * 100),
);

function uiOf(status: ActionStatus): Filter {
  if (status === 'doing') return 'en_cours';
  if (status === 'done') return 'fait';
  return 'a_faire';
}

function fromUi(value: string): ActionStatus {
  if (value === 'en_cours') return 'doing';
  if (value === 'fait') return 'done';
  return 'todo';
}

function badge(tone: SeverityTone): string {
  if (tone === 'check') return 'b-chk';
  return `b-${tone}`;
}

function badgeLabel(tone: SeverityTone): string {
  if (tone === 'crit') return t('plan.badge.crit');
  if (tone === 'fix') return t('hub.sev.fix');
  if (tone === 'check') return t('hub.sev.check');
  return t('hub.sev.minor');
}

function levelWord(value: number): string {
  if (value >= 3) return t('plan.high');
  if (value === 2) return t('plan.mid');
  return t('plan.low');
}

function bars(value: number): boolean[] {
  return [1, 2, 3].map((step) => step <= value);
}

function setFilter(value: Filter): void {
  filter = value;
}

function setSort(value: 'prio' | 'eff'): void {
  sort = value;
}

async function changeStatus(checkId: string, value: string): Promise<void> {
  const status = fromUi(value);
  await onStatus(checkId, status);
  const label =
    status === 'doing'
      ? t('plan.doing')
      : status === 'done'
        ? t('plan.done')
        : t('plan.todo');
  say(t('plan.status.set', { label }));
}

onMount(() => {
  const bar = root?.querySelector<HTMLElement>('.progress');
  const tick = (): void => {
    if (!bar) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? Math.min(1, scrollY / max) : 0;
    bar.style.setProperty('--p', String(ratio));
  };
  tick();
  window.addEventListener('scroll', tick, { passive: true });
  const stop = root ? revealAll(root) : () => {};
  if (calm()) {
    for (const node of root?.querySelectorAll('.rv') ?? []) {
      node.classList.add('in');
    }
  }
  return () => {
    window.removeEventListener('scroll', tick);
    stop();
  };
});
</script>

<div bind:this={root}>
  <div class="progress" aria-hidden="true"></div>
  <nav class="crumbs" aria-label={t('hub.crumbs')}>
    <ol>
      <li><a href="/sites">{t('plan.sites')}</a></li>
      <li><a href={reportHref(auditId)}>{host}</a></li>
      <li><span aria-current="page">{t('plan.crumb')}</span></li>
    </ol>
  </nav>
  <section class="panel rv" aria-labelledby="h">
    <div class="ph">
      <div>
        <p class="eyebrow"><span class="dot" aria-hidden="true"></span>{t('plan.eyebrow', { host })}</p>
        <h1 id="h">{t('hub.plan.title')}</h1>
        <p class="lede">{t('plan.lede')}</p>
      </div>
      <div>
        <div class="kpis">
          <div class="kpi"><b id="k-todo">{counts.todo}</b><span>{t('plan.todo')}</span></div>
          <div class="kpi"><b id="k-doing">{counts.doing}</b><span>{t('plan.doing')}</span></div>
          <div class="kpi"><b id="k-done">{counts.done}</b><span>{t('plan.kpi.done')}</span></div>
        </div>
        <div class="pbar" role="progressbar" aria-label={t('plan.bar')} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress} id="pb"><i style={`--w:${progress}%`}></i></div>
      </div>
    </div>
  </section>
  <section aria-labelledby="hm">
    <h2 id="hm" class="h2">{t('plan.where')}</h2>
    <div class="matrix">
      <div class="mq q1 rv"><b id="m1">{matrix[0]}</b><h3>{t('plan.q1')}</h3><p>{t('plan.q1p')}</p></div>
      <div class="mq rv"><b id="m2">{matrix[1]}</b><h3>{t('plan.q2')}</h3><p>{t('plan.q2p')}</p></div>
      <div class="mq rv"><b id="m3">{matrix[2]}</b><h3>{t('plan.q3')}</h3><p>{t('plan.q3p')}</p></div>
      <div class="mq rv"><b id="m4">{matrix[3]}</b><h3>{t('plan.q4')}</h3><p>{t('plan.q4p')}</p></div>
    </div>
  </section>
  <section class="sec" aria-labelledby="ht">
    <h2 id="ht" class="h2">{t('plan.tasks')}</h2>
    <div class="filters" role="group" aria-label={t('plan.filters')}>
      <fieldset class="fg"><legend>{t('plan.status')}</legend>
        <button class="fb" type="button" aria-pressed={filter === 'all'} onclick={() => setFilter('all')}>{t('plan.all')}</button>
        <button class="fb" type="button" aria-pressed={filter === 'a_faire'} onclick={() => setFilter('a_faire')}>{t('plan.todo')}</button>
        <button class="fb" type="button" aria-pressed={filter === 'en_cours'} onclick={() => setFilter('en_cours')}>{t('plan.doing')}</button>
        <button class="fb" type="button" aria-pressed={filter === 'fait'} onclick={() => setFilter('fait')}>{t('plan.kpi.done')}</button>
      </fieldset>
      <fieldset class="fg"><legend>{t('plan.sort')}</legend>
        <button class="fb" type="button" aria-pressed={sort === 'prio'} onclick={() => setSort('prio')}>{t('plan.sort.prio')}</button>
        <button class="fb" type="button" aria-pressed={sort === 'eff'} onclick={() => setSort('eff')}>{t('plan.sort.eff')}</button>
      </fieldset>
    </div>
    <p class="sr-only" id="cnt" aria-live="polite">{visible.length > 1 ? t('plan.count.many', { n: visible.length }) : t('plan.count.one', { n: visible.length })}</p>
    <ol class="tasks" id="tasks">
      {#each visible as task, index (task.row.checkId)}
        <li class="task rv" class:is-done={task.status === 'done'} data-st={uiOf(task.status)} data-imp={task.impact} data-eff={task.effort} data-sev={task.tone === 'check' ? 'chk' : task.tone}>
          <div>
            <h3 id={`t${index}-t`}>{task.row.title}</h3>
            <div class="row">
              <span class="badge {badge(task.tone)}">{badgeLabel(task.tone)}</span>
              <span class="lvl">{t('plan.impact')} <i aria-hidden="true">{#each bars(task.impact) as on, bar}<b class:on></b>{/each}</i><span class="sr-only"> {levelWord(task.impact)}</span></span>
              <span class="lvl">{t('plan.effort')} <i aria-hidden="true">{#each bars(task.effort) as on, bar}<b class:on></b>{/each}</i><span class="sr-only"> {levelWord(task.effort)}</span></span>
              <span class="dmn">· {domainPager(task.row.domain ?? '')}</span>
            </div>
            <p>{task.row.why}</p>
            <div class="links">
              <a class="lk-pill" href={detailHref(auditId, task.row.checkId)}>{t('plan.detail')}</a>
              <a class="lk-pill" href={domainHref(auditId, task.row.domain ?? '')}>{t('plan.domain', { name: domainPager(task.row.domain ?? '') })}</a>
            </div>
          </div>
          <div class="stsel">
            <label for={`t${index}-s`}>{t('plan.status')}</label>
            <select id={`t${index}-s`} data-v={uiOf(task.status)} aria-describedby={`t${index}-t`} value={uiOf(task.status)} onchange={(event) => changeStatus(task.row.checkId, event.currentTarget.value)}>
              <option value="a_faire">{t('plan.todo')}</option>
              <option value="en_cours">{t('plan.doing')}</option>
              <option value="fait">{t('plan.done')}</option>
            </select>
          </div>
        </li>
      {/each}
    </ol>
    <p class="empty" id="empty" hidden={visible.length > 0}>{t('plan.empty')}</p>
  </section>
  <section class="sec" aria-labelledby="hl">
    <h2 id="hl" class="h2">{t('plan.more')}</h2>
    <ul class="lk-grid">
      <li><a class="lk" href={briefHref(auditId)}><span class="lk-tx"><span class="lk-t">{t('plan.brief')}</span><span class="lk-d">{t('plan.brief.d')}</span></span></a></li>
      <li><a class="lk" href={reportHref(auditId)}><span class="lk-tx"><span class="lk-t">{t('plan.report')}</span><span class="lk-d">{t('plan.report.d')}</span></span></a></li>
      <li><a class="lk" href={`/rapport/${auditId}/imprimer`}><span class="lk-tx"><span class="lk-t">{t('plan.pdf')}</span><span class="lk-d">{t('plan.pdf.d')}</span></span></a></li>
    </ul>
    <p class="acts"><a class="lk-pill" href={reportHref(auditId)} download={downloadName} onclick={onDownload}>{t('export.markdown')}</a></p>
    <details>
      <summary>{t('verify.how')}</summary>
      <p>{t('verify.lead')}</p>
      <p>{t('verify.pending')}</p>
    </details>
  </section>
</div>
<div class="toast" id="toast" aria-hidden="true"></div>
<p class="sr-only" id="live" role="status" aria-live="polite"></p>
