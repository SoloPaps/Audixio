<script lang="ts">
import { onMount, tick } from 'svelte';
import { formatFixed } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { storedSessionPresent } from '../lib/auth-storage.js';
import type { BriefChoice } from '../lib/brief-fetch.js';
import { requestBriefExport, saveBriefExport } from '../lib/brief-fetch.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import type { CategoryItem } from '../lib/categories.js';
import { domainLede, shownConclusion } from '../lib/domain-conclusion.js';
import {
  domainPager,
  domainSentence,
  domainShort,
  REPORT_DOMAINS,
} from '../lib/domains.js';
import { briefSelectionRow } from '../lib/finding-choice.js';
import type { Finding } from '../lib/findings.js';
import { detailHref, domainLetter } from '../lib/hub-view.js';
import { countUp, revealAll, say } from '../lib/motion.js';
import { loginHref } from '../lib/nav.js';
import { levelForScore } from '../lib/score.js';
import InlineCode from './InlineCode.svelte';

interface Props {
  auditId: string;
  domainId: string;
  host: string;
  verified: boolean;
  score: number | null;
  findings: Finding[];
  items: CategoryItem[];
  url: string;
  stamp: Date;
}

let { auditId, domainId, host, verified, score, findings, items }: Props =
  $props();

type Filter = 'all' | 'crit' | 'fix' | 'ok';
type Choice = 'none' | 'chk' | 'fix';
type Sev = 'crit' | 'fix' | 'ok';

let root: HTMLElement | undefined = $state();
let filter = $state<Filter>('all');
let sortDesc = $state(true);
let open = $state<Record<string, boolean>>({});
let choices = $state<Record<string, Choice>>({});
let copied = $state(false);
let signedIn = $state(false);

const letter = $derived(domainLetter(score, false));
const level = $derived(levelForScore(score));
const name = $derived(domainShort(domainId));
const sentence = $derived(domainSentence(domainId, level));
const measured = $derived(level !== 'untested');
const title = $derived(
  !measured
    ? name
    : domainId === 'performance' && (level === 'improve' || level === 'problem')
      ? t('domaine.performance.title')
      : sentence,
);
const lede = $derived(
  domainLede(
    domainId,
    level,
    findings.filter((item) => item.status !== 'pass').length,
    sentence,
    findings.length,
  ),
);
const cardTitle = $derived(
  shownConclusion(
    level,
    domainId === 'performance' ? t('domaine.card.speed') : sentence,
  ) ?? t('hub.untested'),
);
const cardSub = $derived(
  shownConclusion(
    level,
    domainId === 'performance' ? t('domaine.card.speed.sub') : name,
  ) ?? '',
);
const order = REPORT_DOMAINS as readonly string[];
const index = $derived(Math.max(0, order.indexOf(domainId)));
const prevId = $derived(
  order[(index - 1 + order.length) % order.length] ?? domainId,
);
const nextId = $derived(order[(index + 1) % order.length] ?? domainId);
const prev = $derived(items.find((item) => item.id === prevId));
const next = $derived(items.find((item) => item.id === nextId));
const hubHref = $derived(`/rapport?id=${encodeURIComponent(auditId)}`);

function sevOf(item: Finding): Sev {
  if (item.status === 'pass') return 'ok';
  if (item.status === 'fail' && item.severity >= 4) return 'crit';
  return 'fix';
}
function isChoice(value: string): value is Choice {
  return value === 'none' || value === 'chk' || value === 'fix';
}

async function loadChoices(): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) return;
  const { data, error } = await supabase
    .from('brief_selections')
    .select('finding_id, choice')
    .eq('audit_id', auditId);
  if (error || !data) return;
  const next = { ...choices };
  for (const row of data) {
    if (isChoice(row.choice)) next[row.finding_id] = row.choice;
  }
  choices = next;
}

async function persistChoice(
  id: string,
  choice: Choice,
  previous: Choice | undefined,
): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) return;
  const { error } = await supabase.from('brief_selections').upsert(
    briefSelectionRow({
      userId: session.user.id,
      auditId,
      findingId: id,
      choice,
      at: new Date().toISOString(),
    }),
    { onConflict: 'user_id,audit_id,finding_id' },
  );
  if (!error) return;
  const next = { ...choices };
  if (previous === undefined) delete next[id];
  else next[id] = previous;
  choices = next;
  say(t('api.error.internal'), document.getElementById('live'));
}

function choose(id: string, choice: Choice): void {
  const previous = choices[id];
  choices = { ...choices, [id]: choice };
  void persistChoice(id, choice, previous);
}

function choiceOf(item: Finding): Choice {
  return (
    choices[item.id] ??
    (item.status === 'fail' ? 'fix' : item.status === 'warn' ? 'chk' : 'none')
  );
}
function rankOf(sev: Sev): number {
  if (sev === 'crit') return 0;
  if (sev === 'fix') return 1;
  return 2;
}

const counted = $derived({
  all: findings.length,
  crit: findings.filter((item) => sevOf(item) === 'crit').length,
  fix: findings.filter((item) => sevOf(item) === 'fix').length,
  ok: findings.filter((item) => sevOf(item) === 'ok').length,
});
const shown = $derived(
  findings
    .filter((item) => filter === 'all' || sevOf(item) === filter)
    .slice()
    .sort(
      (a, b) => (rankOf(sevOf(a)) - rankOf(sevOf(b))) * (sortDesc ? 1 : -1),
    ),
);
const actionable = $derived(findings.filter((item) => sevOf(item) !== 'ok'));
const fixN = $derived(
  actionable.filter((item) => choiceOf(item) === 'fix').length,
);
const chkN = $derived(
  actionable.filter((item) => choiceOf(item) === 'chk').length,
);
const selectedN = $derived(fixN + chkN);
const ladder = ['D', 'C', 'B', 'A'] as const;

function secondsOf(item: Finding): number {
  if (item.status === 'pass') return 0;
  const hard = findings.filter(
    (row) => row.status !== 'pass' && row.severity >= 4,
  );
  if (item.severity >= 4) return hard.indexOf(item) === 0 ? 1.1 : 0.7;
  return 0.3;
}

function frSec(value: number): string {
  return formatFixed(value, 1);
}

const gain = $derived(
  findings.reduce(
    (sum, item) => sum + (item.severity >= 4 ? secondsOf(item) : 0),
    0,
  ),
);
const optN = $derived(findings.filter((item) => item.status !== 'pass').length);

function ladderLabel(id: string): string {
  if (id === letter) return t('domaine.now');
  const speed = domainId === 'performance';
  if (id === 'D') return speed ? t('domaine.slow') : t('domaine.low');
  if (id === 'C') return t('domaine.mid');
  if (id === 'B') return speed ? t('domaine.fast') : t('domaine.good');
  if (id === 'A') return t('domaine.goal');
  return id;
}

function placeInd(node: HTMLElement): void {
  for (const group of node.querySelectorAll<HTMLElement>('.seg')) {
    const mark = group.querySelector<HTMLElement>('.ind');
    const active = group.querySelector<HTMLElement>('label:has(input:checked)');
    if (!mark || !active) continue;
    mark.style.width = `${active.offsetWidth}px`;
    mark.style.height = `${active.offsetHeight}px`;
    mark.style.transform = `translate(${active.offsetLeft}px,${active.offsetTop}px)`;
    const input = active.querySelector('input');
    if (input) group.dataset.v = input.value;
  }
}

function selection(): BriefChoice[] {
  const chosen: BriefChoice[] = [];
  for (const item of actionable) {
    const choice = choiceOf(item);
    if (choice === 'none') continue;
    chosen.push({
      checkId: item.id,
      mode: choice === 'fix' ? 'fix' : 'verif',
    });
  }
  return chosen;
}

async function serverFile(): Promise<{
  filename: string;
  markdown: string;
} | null> {
  const session = await currentSession();
  const token = session?.access_token;
  if (!token) {
    say(t('api.error.unauthorized'), document.getElementById('live'));
    return null;
  }
  const file = await requestBriefExport(auditId, token, selection());
  if (!file.ok) {
    say(file.message, document.getElementById('live'));
    return null;
  }
  return file;
}

async function onGenerate(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const file = await serverFile();
  if (!file) {
    copied = false;
    return;
  }
  try {
    await navigator.clipboard.writeText(file.markdown);
    copied = true;
    say(t('domaine.prompt.done'), document.getElementById('live'));
  } catch {
    copied = false;
    say(t('api.error.internal'), document.getElementById('live'));
  }
}

async function onCopyBrief(): Promise<void> {
  const file = await serverFile();
  if (!file) return;
  try {
    await navigator.clipboard.writeText(file.markdown);
    say(t('domaine.prompt.done'), document.getElementById('live'));
  } catch {
    say(t('api.error.internal'), document.getElementById('live'));
  }
}

async function onExport(): Promise<void> {
  const file = await serverFile();
  if (!file) return;
  saveBriefExport(file.filename, file.markdown);
}

async function onMail(event: MouseEvent): Promise<void> {
  event.preventDefault();
  const link = event.currentTarget;
  if (!(link instanceof HTMLAnchorElement)) return;
  const file = await serverFile();
  if (!file) return;
  const subject = encodeURIComponent(name);
  const body = encodeURIComponent(file.markdown.slice(0, 1800));
  link.href = `mailto:?subject=${subject}&body=${body}`;
  window.location.assign(link.href);
}

$effect(() => {
  filter;
  sortDesc;
  choices;
  findings;
  if (!root) return;
  void tick().then(() => {
    if (root) placeInd(root);
  });
});

onMount(() => {
  signedIn = storedSessionPresent();
  void loadChoices();
  document.documentElement.dataset.vue = 'domaine';
  document.documentElement.classList.add('has-ind');
  let stop = (): void => {};
  void tick().then(() => {
    if (!root) return;
    placeInd(root);
    stop = revealAll(root, '.rv,.gbar');
    countUp(root);
  });
  const onResize = (): void => {
    if (root) placeInd(root);
  };
  window.addEventListener('resize', onResize);
  return () => {
    stop();
    window.removeEventListener('resize', onResize);
  };
});
</script>

{#snippet chev()}
  <span class="chev" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>
{/snippet}

<div style="display:contents" bind:this={root}>
  <nav class="crumbs" aria-label={t('hub.crumbs')}><ol><li><a href={hubHref}>{t('report.heading')} {host}</a></li><li><span aria-current="page">{name}</span></li></ol></nav>
  <div class="khero">
    <div class="aurora" aria-hidden="true"><i class="layer" data-depth="1"></i><i class="layer" data-depth="-.7"></i><i class="layer" data-depth=".5"></i><i></i></div>
    <div class="topbar">
      <a class="backl" href={hubHref}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg><span>{t('domaine.overview')}</span></a>
      {#if verified}<span class="badge b-own"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>{t('domaine.owned', { host })}</span>{/if}
    </div>
    <div class="dh">
      <div>
        <div class="meta"><span class="tag">{t('domaine.tag', { name })}</span></div>
        <h1>{title}<span class="q">{t('domaine.q')}</span></h1>
        {#if lede}<p class="lede">{lede}</p>{/if}
        <div class="hacts">
          <a class="btn btn-primary" href="#constats">{t('domaine.see', { n: findings.length })}</a>
          <a class="btn btn-ghost" href="#prompt">{t('domaine.prepare')}</a>
        </div>
      </div>
      <section class="card gcard g-{letter?.toLowerCase() ?? 'n'} rv" aria-labelledby="gt">
        <div class="gtop"><span class="gbig" aria-hidden="true">{letter ?? '–'}</span><div><h2 id="gt">{#if letter}<span class="sr-only">{t('domaine.grade.note', { grade: letter })}</span>{/if}{cardTitle}</h2><p>{cardSub}</p></div></div>
        <div class="gbar" aria-hidden="true"><i style={`--v:${Math.max(0, Math.min(100, score ?? 0)) / 100}`}></i></div>
        <ol class="ladder rv" aria-label={t('domaine.ladder')}>
          {#each ladder as step (step)}
            <li class={`g-${step.toLowerCase()}`} class:now={step === letter} class:goal={step === 'A'} aria-current={step === letter ? 'step' : undefined}><span class="gchip">{step}</span>{ladderLabel(step)}</li>
          {/each}
        </ol>
        {#if gain > 0}
          <p class="gain"><span class="v">+{frSec(gain)} s</span><small>{t('domaine.gain.lead')}</small></p>
          <p class="gnote"><span class="badge b-fix">{t('domaine.gain.opt', { n: optN })}</span> {t('domaine.gain.goal')}</p>
        {/if}
      </section>
    </div>
  </div>

  <section class="block" id="constats" aria-labelledby="ct">
    <div class="sh2"><div><p class="eyebrow">{t('domaine.constats.eyebrow', { n: findings.length })}</p><h2 id="ct">{t('domaine.constats')}</h2></div></div>
    <div class="tools">
      <fieldset>
        <legend class="sr-only">{t('domaine.filter')}</legend>
        <div class="seg" id="flt"><span class="ind" aria-hidden="true"></span>
          {#each ['all', 'crit', 'fix', 'ok'] as key (key)}
            <label><input type="radio" name="f" value={key} checked={filter === key} onchange={() => { filter = key as Filter; }}>{key === 'all' ? t('domaine.filter.all') : key === 'crit' ? t('domaine.filter.crit') : key === 'fix' ? t('domaine.filter.mod') : t('domaine.filter.ok')} <span class="n" data-to={counted[key as Filter]}>{counted[key as Filter]}</span></label>
          {/each}
        </div>
      </fieldset>
      <label class="sortw" for="sort">{t('domaine.sort')}
        <select id="sort" onchange={(event) => { sortDesc = event.currentTarget.value === 'd'; }}>
          <option value="d">{t('domaine.sort.desc')}</option>
          <option value="a">{t('domaine.sort.asc')}</option>
        </select>
      </label>
    </div>
    <div class="dgrid">
      <div>
        <p class="sr-only" id="fcount">{t('domaine.see', { n: shown.length })}</p>
        <ol class="list" id="list">
          {#each shown as item, index (item.id)}
            {@const sev = sevOf(item)}
            <li class="cst card rv" data-sev={sev} style={`--i:${index}`}>
              <div class="cst-h">
                {#if sev === 'crit'}<span class="badge b-crit">{t('domaine.filter.crit')}</span>
                {:else if sev === 'fix'}<span class="badge b-fix">{t('domaine.filter.mod')}</span>
                {:else}<span class="badge b-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('domaine.filter.ok')}</span>{/if}
                {#if sev === 'ok'}<span class="imp ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('domaine.impact.ok')}</span>
                {:else}<span class="imp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3L5 13h6l-1 8 8-10h-6z"/></svg>{t('domaine.impact.s', { n: frSec(secondsOf(item)) })}</span>{/if}
              </div>
              <h3>{item.title}</h3>
              <p class="cd">{item.why}</p>
              {#if item.limit}
                <details class="finding-limit">
                  <summary>{t('finding.limit')}</summary>
                  <p>{item.limit}</p>
                </details>
              {/if}
              <div class="cst-f">
                {#if sev !== 'ok'}
                  <fieldset class="choice">
                    <legend class="sr-only">{t('domaine.choice', { title: item.title })}</legend>
                    <div class="seg sm"><span class="ind" aria-hidden="true"></span>
                      <label class="o-none"><input type="radio" name={`st-${item.id}`} value="none" checked={choiceOf(item) === 'none'} onchange={() => choose(item.id, 'none')}>{t('domaine.none')}</label>
                      <label class="o-chk"><input type="radio" name={`st-${item.id}`} value="chk" checked={choiceOf(item) === 'chk'} onchange={() => choose(item.id, 'chk')}>{t('domaine.check')}</label>
                      <label class="o-fix"><input type="radio" name={`st-${item.id}`} value="fix" checked={choiceOf(item) === 'fix'} onchange={() => choose(item.id, 'fix')}>{t('domaine.correct')}</label>
                    </div>
                  </fieldset>
                {/if}
                <div class="cst-a">
                  <button type="button" class="det" aria-expanded={open[item.id] ? 'true' : 'false'} aria-controls={`d-${item.id}`} onclick={() => { open = { ...open, [item.id]: !open[item.id] }; }}>{t('domaine.details')} {@render chev()}</button>
                  {#if sev !== 'ok' && (item.actionHref || item.code)}<a class="btn btn-primary btn-sm" href={item.actionHref ?? detailHref(auditId, item.id)}>{t('domaine.fix.link')}</a>
                  {:else if sev !== 'ok'}<span class="soon">{t('domaine.soon')}</span>{/if}
                </div>
              </div>
              <div class="acc" class:open={open[item.id]} id={`d-${item.id}`}><div><div class="acc-in"><p class="al">{sev === 'ok' ? t('domaine.observe') : t('domaine.actions')}</p><ul>{#each item.steps as step, stepIndex (step + String(stepIndex))}<li><InlineCode text={step} /></li>{/each}</ul></div></div></div>
            </li>
          {/each}
        </ol>
        <p class="empty card" hidden={shown.length > 0}>{findings.length === 0 ? t('domaine.nothing') : t('domaine.empty')}</p>
      </div>
      <aside class="card pp" id="prompt" aria-labelledby="pt">
        <div class="ph"><span class="pi" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/></svg></span><h2 id="pt">{t('domaine.prompt.title')}</h2></div>
        <p class="sum">{t('domaine.prompt.sum', { n: selectedN, fix: fixN, chk: chkN })}</p>
        <p class="hint">{t('domaine.prompt.hint')}</p>
        <ul>
          {#each actionable as item (item.id)}
            <li><span>{item.title}</span><span class="badge {choiceOf(item) === 'fix' ? 'b-fix' : choiceOf(item) === 'chk' ? 'b-own' : 'b-ok'}">{choiceOf(item) === 'fix' ? t('domaine.correct') : choiceOf(item) === 'chk' ? t('domaine.check') : t('domaine.none')}</span></li>
          {/each}
        </ul>
        <form novalidate onsubmit={onGenerate}>
          <button type="submit" class="fz" class:in={copied}><span class="sr-only">{t('domaine.prompt.gen')}</span><span class="st st-def" aria-hidden="true">{t('domaine.prompt.gen')}</span><span class="st st-ok" aria-hidden="true">{t('domaine.prompt.done')}</span></button>
        </form>
        <p class="out">{t('domaine.prompt.local')}</p>
      </aside>
    </div>
  </section>

  <section class="block" aria-labelledby="xt">
    <div class="card ex rv">
      <div>
        <p class="eyebrow">{t('domaine.export.eyebrow')}</p>
        <h2 id="xt">{t('domaine.export.title')}</h2>
        <p class="sec-lede">{t('domaine.export.lead')}</p>
        <div class="acts">
          {#if signedIn}
            <button type="button" class="btn btn-ghost" onclick={onCopyBrief}>{t('domaine.export.copy')}</button>
            <a class="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent(name)}`} onclick={onMail}>{t('domaine.export.mail')}</a>
            <button type="button" class="btn btn-ghost" onclick={onExport}>{t('domaine.export.file')}</button>
          {:else}
            <button type="button" class="btn btn-ghost" aria-disabled="true">{t('domaine.export.copy')} <span class="sr-only">{t('domaine.lock.sr')}</span></button>
            <button type="button" class="btn btn-ghost" aria-disabled="true">{t('domaine.export.mail')} <span class="sr-only">{t('domaine.lock.sr')}</span></button>
            <button type="button" class="btn btn-ghost" aria-disabled="true">{t('domaine.export.file')} <span class="sr-only">{t('domaine.lock.sr')}</span></button>
          {/if}
        </div>
      </div>
      {#if !signedIn}
        <div class="lockc">
          <span class="lk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>
          <h3>{t('domaine.lock.title')}</h3>
          <ul>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('domaine.lock.1')}</li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('domaine.lock.2')}</li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('domaine.lock.3')}</li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('domaine.lock.4')}</li>
          </ul>
          <a class="btn btn-primary" href={loginHref(`/domaine?id=${encodeURIComponent(auditId)}&domaine=${encodeURIComponent(domainId)}`)}>{t('domaine.lock.cta')}</a>
        </div>
      {/if}
    </div>
  </section>

  <nav class="pager" aria-label={t('domain.nav')}>
    {#if prev?.href}<a href={prev.href}><span class="ar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></span><span><small>{t('domaine.prev')}</small><b>{domainPager(prev.id)}</b></span></a>{/if}
    <a class="mid" href={hubHref}><span class="ar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg></span>{t('domaine.hub')}</a>
    {#if next?.href}<a class="nx" href={next.href}><span><small>{t('domaine.next')}</small><b>{domainPager(next.id)}</b></span><span class="ar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>{/if}
  </nav>
  <p class="eco-line">{t('hub.eco.lead')} <a href="/ecoconception">{t('hub.eco.link')}</a>.</p>
</div>
<p id="live" class="sr-only" aria-live="polite"></p>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
