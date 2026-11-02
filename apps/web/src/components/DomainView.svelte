<script lang="ts">
import { onMount, tick } from 'svelte';
import { t } from '../i18n/index.js';
import { renderBrief, type TerminalMode } from '../lib/brief.js';
import { barState } from '../lib/brief-bar.js';
import type { CategoryItem } from '../lib/categories.js';
import { domainSentence, domainShort, REPORT_DOMAINS } from '../lib/domains.js';
import type { Finding } from '../lib/findings.js';
import { detailHref, domainLetter } from '../lib/hub-view.js';
import { revealAll, say } from '../lib/motion.js';
import { saveTextFile } from '../lib/report-export.js';
import { levelForScore } from '../lib/score.js';

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

let {
  auditId,
  domainId,
  host,
  verified,
  score,
  findings,
  items,
  url,
  stamp,
}: Props = $props();

type Filter = 'all' | 'crit' | 'fix' | 'ok';
type Choice = 'none' | 'chk' | 'fix';
type Sev = 'crit' | 'fix' | 'ok';

let root: HTMLElement | undefined = $state();
let filter = $state<Filter>('all');
let sortDesc = $state(true);
let open = $state<Record<string, boolean>>({});
let choices = $state<Record<string, Choice>>({});
let copied = $state(false);

const letter = $derived(domainLetter(score, false));
const level = $derived(levelForScore(score));
const name = $derived(domainShort(domainId));
const sentence = $derived(domainSentence(domainId, level));
const title = $derived(
  domainId === 'performance' && (level === 'improve' || level === 'problem')
    ? t('domaine.performance.title')
    : sentence,
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
const bar = $derived(
  barState({
    failCount: counted.crit + counted.fix,
    warnCount: chkN,
    passCount: counted.ok,
    selectedCount: selectedN,
  }),
);
const ladder = ['D', 'C', 'B', 'A'] as const;

function ladderLabel(id: string): string {
  if (id === letter) return t('domaine.now');
  if (id === 'D') return t('domaine.slow');
  if (id === 'B') return t('domaine.fast');
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

function briefText(): string {
  const rows = actionable
    .filter((item) => choiceOf(item) !== 'none')
    .map((item) => {
      const mode: TerminalMode = choiceOf(item) === 'fix' ? 'fix' : 'verif';
      return {
        id: item.id,
        checkId: item.id,
        title: item.title,
        statusLabel: mode === 'fix' ? t('domaine.correct') : t('domaine.check'),
        proof: item.why,
        impact: null,
        terminal: mode,
      };
    });
  return renderBrief({
    url,
    at: stamp,
    stack: null,
    findings: rows,
    catalog: new Map(),
    sources: new Map(),
    includeTerminal: rows.some((row) => row.terminal === 'fix'),
  });
}

async function onGenerate(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const text = briefText();
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
    say(t('domaine.prompt.done'), document.getElementById('live'));
  } catch {
    copied = false;
  }
}

function onCopyBrief(): void {
  const text = briefText();
  void navigator.clipboard.writeText(text).then(() => {
    say(t('domaine.prompt.done'), document.getElementById('live'));
  });
}

function onExport(): void {
  saveTextFile(`brief-${host}.md`, briefText());
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
  document.documentElement.dataset.vue = 'domaine';
  document.documentElement.classList.add('has-ind');
  let stop = (): void => {};
  void tick().then(() => {
    if (!root) return;
    placeInd(root);
    stop = revealAll(root, '.rv,.gbar');
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
        <p class="lede">{sentence}</p>
        <div class="hacts">
          <a class="btn btn-primary" href="#constats">{t('domaine.see', { n: findings.length })}</a>
          <a class="btn btn-ghost" href="#prompt">{t('domaine.prepare')}</a>
        </div>
      </div>
      <section class="card gcard g-{letter?.toLowerCase() ?? 'n'} rv" aria-labelledby="gt">
        <div class="gtop"><span class="gbig" aria-hidden="true">{letter ?? '–'}</span><div><h2 id="gt">{#if letter}<span class="sr-only">{t('domaine.grade.note', { grade: letter })}</span>{/if}{sentence}</h2><p>{name}</p></div></div>
        <div class="gbar" aria-hidden="true"><i style={`--v:${Math.max(0, Math.min(100, score ?? 0)) / 100}`}></i></div>
        <ol class="ladder rv" aria-label={t('domaine.ladder')}>
          {#each ladder as step (step)}
            <li class={`g-${step.toLowerCase()}`} class:now={step === letter} aria-current={step === letter ? 'step' : undefined}><span class="gchip">{step}</span>{ladderLabel(step)}</li>
          {/each}
        </ol>
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
            <label><input type="radio" name="f" value={key} checked={filter === key} onchange={() => { filter = key as Filter; }}>{key === 'all' ? t('domaine.filter.all') : key === 'crit' ? t('domaine.filter.crit') : key === 'fix' ? t('domaine.filter.mod') : t('domaine.filter.ok')} <span class="n">{counted[key as Filter]}</span></label>
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
                {:else}<span class="badge b-ok">{t('domaine.filter.ok')}</span>{/if}
              </div>
              <h3>{item.title}</h3>
              <p class="cd">{item.why}</p>
              <div class="cst-f">
                {#if sev !== 'ok'}
                  <fieldset class="choice">
                    <legend class="sr-only">{t('domaine.choice', { title: item.title })}</legend>
                    <div class="seg sm"><span class="ind" aria-hidden="true"></span>
                      <label class="o-none"><input type="radio" name={`st-${item.id}`} value="none" checked={choiceOf(item) === 'none'} onchange={() => { choices = { ...choices, [item.id]: 'none' }; }}>{t('domaine.none')}</label>
                      <label class="o-chk"><input type="radio" name={`st-${item.id}`} value="chk" checked={choiceOf(item) === 'chk'} onchange={() => { choices = { ...choices, [item.id]: 'chk' }; }}>{t('domaine.check')}</label>
                      <label class="o-fix"><input type="radio" name={`st-${item.id}`} value="fix" checked={choiceOf(item) === 'fix'} onchange={() => { choices = { ...choices, [item.id]: 'fix' }; }}>{t('domaine.correct')}</label>
                    </div>
                  </fieldset>
                {/if}
                <div class="cst-a">
                  <button type="button" class="det" aria-expanded={open[item.id] ? 'true' : 'false'} aria-controls={`d-${item.id}`} onclick={() => { open = { ...open, [item.id]: !open[item.id] }; }}>{t('domaine.details')} {@render chev()}</button>
                  {#if sev !== 'ok'}<a class="btn btn-primary btn-sm" href={detailHref(auditId, item.id)}>{t('domaine.fix.link')}</a>{/if}
                </div>
              </div>
              <div class="acc" class:open={open[item.id]} id={`d-${item.id}`}><div><div class="acc-in"><p class="al">{sev === 'ok' ? t('domaine.observe') : t('domaine.actions')}</p><ul>{#each item.steps as step, stepIndex (step + String(stepIndex))}<li>{step}</li>{/each}</ul></div></div></div>
            </li>
          {/each}
        </ol>
        <p class="empty card" hidden={shown.length > 0}>{t('domaine.empty')}</p>
      </div>
      <aside class="card pp" id="prompt" aria-labelledby="pt">
        <div class="ph"><h2 id="pt">{t('domaine.prompt.title')}</h2></div>
        <p class="sum">{t('domaine.prompt.sum', { n: selectedN, fix: fixN, chk: chkN })}</p>
        {#if bar.hint}<p class="hint">{t('domaine.prompt.hint')}</p>{/if}
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
          <button type="button" class="btn btn-ghost" onclick={onCopyBrief}>{t('domaine.export.copy')}</button>
          <a class="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(briefText())}`}>{t('domaine.export.mail')}</a>
          <button type="button" class="btn btn-ghost" onclick={onExport}>{t('domaine.export.file')}</button>
        </div>
      </div>
    </div>
  </section>

  <nav class="pager" aria-label={t('domain.nav')}>
    {#if prev?.href}<a href={prev.href}><span><small>{t('domaine.prev')}</small><b>{domainShort(prev.id)}</b></span></a>{/if}
    <a class="mid" href={hubHref}>{t('domaine.hub')}</a>
    {#if next?.href}<a class="nx" href={next.href}><span><small>{t('domaine.next')}</small><b>{domainShort(next.id)}</b></span></a>{/if}
  </nav>
  <p class="eco-line">{t('hub.eco.lead')} <a href="/ecoconception">{t('hub.eco.link')}</a>.</p>
</div>
<p id="live" class="sr-only" aria-live="polite"></p>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
