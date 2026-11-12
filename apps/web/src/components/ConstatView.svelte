<script lang="ts">
import { onMount, tick } from 'svelte';
import { formatFixed } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { copyText } from '../lib/clipboard.js';
import { constatShowsImageInventory } from '../lib/constat-kind.js';
import {
  drawRadar,
  pictureSample,
  stageAt,
  stageImages,
  stageSeconds,
} from '../lib/constat-stage.js';
import { domainPager } from '../lib/domains.js';
import {
  detailHref,
  type SeverityTone,
  severityTone,
} from '../lib/hub-view.js';
import { calm, revealAll, say } from '../lib/motion.js';
import type { ReportRow } from '../lib/report-model.js';
import { domainHref, reportHref } from '../lib/report-route.js';
import InlineCode from './InlineCode.svelte';

interface Props {
  auditId: string;
  host: string;
  verified: boolean;
  row: ReportRow;
  siblings: ReportRow[];
  allowed: boolean;
}

let { auditId, host, verified, row, siblings, allowed }: Props = $props();

const showcase = $derived(
  constatShowsImageInventory(row.messageKey) && allowed,
);
const name = $derived(domainPager(row.domain ?? ''));
const tone = $derived(severityTone(row.severity, row.catalogStatus));
const index = $derived(
  Math.max(
    0,
    siblings.findIndex((item) => item.checkId === row.checkId),
  ),
);
const prev = $derived(index > 0 ? siblings[index - 1] : null);
const next = $derived(index < siblings.length - 1 ? siblings[index + 1] : null);
const hubHref = $derived(reportHref(auditId));
const domainLink = $derived(domainHref(auditId, row.domain ?? ''));
const briefHref = $derived(reportHref(auditId, 'brief'));

let root = $state<HTMLElement | null>(null);
let radar = $state<HTMLCanvasElement | null>(null);
let query = $state('');
let tab = $state<'cms' | 'code'>('cms');
let mbps = $state(32);
let today = $state(stageAt(32).today);
let after = $state(stageAt(32).after);
let gain = $state(stageAt(32).gain);
let busy = $state(false);

const shown = $derived(
  stageImages.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  ),
);

const cms = [
  ['constat.cms1.t', 'constat.cms1.p', 'constat.cms1.g'],
  ['constat.cms2.t', 'constat.cms2.p', 'constat.cms2.g'],
  ['constat.cms3.t', 'constat.cms3.p', 'constat.cms3.g'],
] as const;
const code = [
  ['constat.code1.t', 'constat.code1.p', 'constat.code1.g'],
  ['constat.code2.t', 'constat.code2.p', 'constat.code2.g'],
  ['constat.code3.t', 'constat.code3.p', 'constat.code3.g'],
] as const;

const pictureHtml = pictureSample
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/(&lt;\/?)(picture|source|img)/g, '$1<span class="t">$2</span>')
  .replace(
    /\s(type|srcset|sizes|src|width|height|alt|fetchpriority|decoding)=/g,
    ' <span class="a">$1</span>=',
  )
  .replace(/="([^"]*)"/g, '=<span class="s">"$1"</span>');

function toneClass(value: SeverityTone): string {
  if (value === 'check') return 'b-chk';
  return `b-${value}`;
}

function toneLabel(value: SeverityTone): string {
  if (value === 'crit') return t('constat.crit');
  if (value === 'fix') return t('constat.fix');
  if (value === 'check') return t('constat.check');
  return t('constat.minor');
}

function placeInd(node: HTMLElement): void {
  const groups = [
    ...node.querySelectorAll<HTMLElement>('.seg'),
    ...node.querySelectorAll<HTMLElement>('.tabs'),
  ];
  for (const group of groups) {
    const mark = group.querySelector<HTMLElement>('.ind');
    const active = group.querySelector<HTMLElement>(
      'label:has(input:checked), [aria-selected="true"]',
    );
    if (!mark || !active) continue;
    mark.style.width = `${active.offsetWidth}px`;
    mark.style.height = `${active.offsetHeight}px`;
    mark.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
  }
}

function paint(final = false): void {
  const snap = stageAt(mbps);
  if (final || calm()) {
    today = snap.today;
    after = snap.after;
    gain = snap.gain;
    return;
  }
  const tb = stageSeconds(4800, mbps);
  const ta = stageSeconds(438, mbps);
  const duration = Math.min(4200, Math.max(1400, tb * 700));
  const t0 = performance.now();
  const frame = (now: number): void => {
    const p = Math.min(1, (now - t0) / duration);
    today =
      stageAt(mbps).today && stageSeconds(4800, mbps)
        ? `${formatFixed(tb * p, p < 1 && tb * p < 1 ? 2 : 1)} s`
        : snap.today;
    const shownAfter = ta * Math.min(1, (p * tb) / ta);
    after = `${formatFixed(shownAfter, shownAfter < 1 ? 2 : 1)} s`;
    const rootEl = document.getElementById('fB');
    const afterEl = document.getElementById('fA');
    if (rootEl) rootEl.style.transform = `scaleX(${p})`;
    if (afterEl) {
      afterEl.style.transform = `scaleX(${Math.min(1, (p * tb) / ta)})`;
    }
    if (p < 1) requestAnimationFrame(frame);
    else {
      today = snap.today;
      after = snap.after;
      gain = snap.gain;
    }
  };
  gain = snap.gain;
  requestAnimationFrame(frame);
}

function onNet(value: string): void {
  mbps = Number(value);
  paint(calm());
  say(
    `${mbps === 3 ? t('constat.net.3g') : mbps === 200 ? t('constat.net.fibre') : t('constat.net.4g')} : ${today}`,
  );
}

async function onShare(): Promise<void> {
  const url = location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url });
      return;
    } catch {
      /* copie ensuite */
    }
  }
  say((await copyText(url)) ? t('constat.shared') : t('copy.failed'));
}

function onPdf(): void {
  busy = true;
  window.setTimeout(
    () => {
      busy = false;
      say(t('constat.pdf.ready'));
      window.print();
    },
    calm() ? 0 : 1100,
  );
}

async function onCopy(): Promise<void> {
  say((await copyText(pictureSample)) ? t('constat.copied') : t('copy.failed'));
}

function onTab(nextTab: 'cms' | 'code'): void {
  tab = nextTab;
  void tick().then(() => {
    if (root) placeInd(root);
  });
}

$effect(() => {
  query;
  tab;
  mbps;
  if (!root) return;
  void tick().then(() => {
    if (root) placeInd(root);
  });
});

onMount(() => {
  paint(true);
  let stop = (): void => {};
  let frame = 0;
  const loop = (time: number): void => {
    if (radar) drawRadar(radar, time, calm());
    if (!calm()) frame = requestAnimationFrame(loop);
  };
  void tick().then(() => {
    if (root) {
      placeInd(root);
      stop = revealAll(root);
    }
    if (radar) drawRadar(radar, 0, calm());
    if (!calm()) frame = requestAnimationFrame(loop);
  });
  const onResize = (): void => {
    if (root) placeInd(root);
    if (radar) drawRadar(radar, 0, calm());
  };
  window.addEventListener('resize', onResize);
  return () => {
    stop();
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
  };
});
</script>

<div class="has-ind" bind:this={root}>
  <nav class="crumbs" aria-label={t('hub.crumbs')}>
    <ol>
      <li><a href={hubHref}>{t('report.heading')} {host}</a></li>
      <li><a href={domainLink}>{name}</a></li>
      <li><span aria-current="page">{allowed ? row.title : t('domain.locked.badge')}</span></li>
    </ol>
  </nav>
  {#if !allowed}
    <section class="card pad">
      <h1>{t('domain.locked.badge')}</h1>
      <p>{t('domain.locked.teaser')}</p>
      <p><a class="btn btn-primary" href={domainLink}>{t('constat.back', { name })}</a></p>
    </section>
  {:else}
    <div class="khero">
      <div class="aurora" aria-hidden="true"><i class="layer" data-depth="1"></i><i class="layer" data-depth="-.7"></i><i class="layer" data-depth=".5"></i><i></i></div>
      <div class="rbg" aria-hidden="true"><canvas class="ax-radar" id="axRadar" bind:this={radar} aria-hidden="true"></canvas></div>
      <div class="topbar">
        <a class="backl" href={domainLink}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg><span>{t('constat.back', { name })}</span></a>
        {#if verified}<span class="badge b-own"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>{t('constat.owned')}</span>{/if}
      </div>
      <div class="ch-hero">
        <div>
          <div class="meta"><span class="badge {toneClass(tone)}">{toneLabel(tone)}</span><span class="tag">{t('constat.tag', { domain: name, n: String(index + 1).padStart(2, '0') })}</span></div>
          <h1>{row.title}</h1>
          <p class="lede">{showcase ? t('constat.px.lede') : row.why}</p>
          <div class="hacts">
            <a class="btn btn-primary" href="#plan">{t('constat.plan.link')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            <button class="btn btn-ghost" type="button" onclick={onShare}><span class="cp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg><span class="bl">{t('constat.share')}</span></span></button>
            <button class="btn btn-ghost" type="button" aria-busy={busy} onclick={onPdf}><span class="bl cp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>{t('constat.pdf')}</span><span class="spin" aria-hidden="true"></span></button>
          </div>
        </div>
      </div>
      {#if showcase}
      <ul class="stats">
        <li class="card stat rv sheen"><div class="sh"><h2>{t('constat.stat.weight')}</h2></div><p class="val"><span>{showcase ? '4,8' : '–'}</span><small>{t('constat.mo')}</small></p><p class="foot"><span>{t('constat.weight.target')}</span><b>{t('constat.weight.gain')}</b></p></li>
        <li class="card stat rv sheen"><div class="sh"><h2>{t('constat.stat.wait')}</h2></div><p class="val"><span>{showcase ? '1,2' : '–'}</span><small>{t('constat.sec')}</small></p><p class="foot"><span>{t('constat.wait.net')}</span><b>{t('constat.wait.risk')}</b></p></li>
        <li class="card stat rv sheen"><div class="sh"><h2>{t('constat.stat.files')}</h2></div><p class="val"><span>{showcase ? '6' : '–'}</span><small>{t('constat.images')}</small></p><p class="foot"><span>{t('constat.files.kind')}</span><b>{t('constat.files.modern')}</b></p></li>
      </ul>
      {/if}
    </div>

    {#if showcase}
    <section class="block sim" aria-labelledby="t-sim">
      <p class="kicker">{t('constat.sim.k')}</p>
      <h2 class="sec" id="t-sim">{t('constat.sim.h')}</h2>
      <p class="sec-lede">{t('constat.sim.p')}</p>
      <div class="card pad rv">
        <fieldset class="netf"><legend>{t('constat.net')}</legend>
          <div class="seg" id="net"><span class="ind" aria-hidden="true"></span>
            <label><input type="radio" name="net" value="32" checked={mbps === 32} onchange={() => onNet('32')}>{t('constat.net.4g')}</label>
            <label><input type="radio" name="net" value="3" checked={mbps === 3} onchange={() => onNet('3')}>{t('constat.net.3g')}</label>
            <label><input type="radio" name="net" value="200" checked={mbps === 200} onchange={() => onNet('200')}>{t('constat.net.fibre')}</label>
          </div>
        </fieldset>
        <div class="race" id="race">
          <div class="lane"><div class="lane-h"><p>{t('constat.today')} <span>· 4,8 {t('constat.mo')}</span></p><output id="oB">{today}</output></div><div class="track bf" aria-hidden="true"><i id="fB" style="transform:scaleX(1)"></i></div></div>
          <div class="lane"><div class="lane-h"><p>{t('constat.after')} <span>· ≈ 440 Ko</span></p><output id="oA">{after}</output></div><div class="track af" aria-hidden="true"><i id="fA" style="transform:scaleX(1)"></i></div></div>
        </div>
        <div class="sim-foot"><p class="delta" id="delta">{t('constat.gained')} <b>{gain}</b></p><button class="btn btn-ghost btn-sm" type="button" onclick={() => paint(calm())}>{t('constat.replay')}</button></div>
        <p class="hint">{t('constat.sim.note')}</p>
      </div>
    </section>

    <section class="block" aria-labelledby="t-inv">
      <p class="kicker">{t('constat.inv.k')}</p>
      <div class="tool">
        <div><h2 class="sec" id="t-inv">{t('constat.inv.h')}</h2><p class="sec-lede">{showcase ? t('constat.inv.p') : t('constat.generic.p')}</p></div>
        <div class="search" role="search"><label for="filter">{t('constat.filter')}</label><div class="inp"><input id="filter" type="search" placeholder={t('constat.filter.ph')} autocomplete="off" bind:value={query} aria-describedby="cnt"></div></div>
      </div>
      <table class="inv" id="inv">
        <caption id="cnt">{t('constat.cap', { n: showcase ? shown.length : 0, total: showcase ? stageImages.length : 0 })}</caption>
        <thead><tr><th scope="col">{t('constat.col.file')}</th><th scope="col">{t('constat.col.now')}</th><th scope="col">{t('constat.col.next')}</th><th scope="col">{t('constat.col.save')}</th></tr></thead>
        <tbody>
          {#if showcase}
            {#each stageImages as item, i (item.name)}
              <tr class="rv in" class:hide={!shown.includes(item)} data-name={item.name} style={`--i:${i}`}>
                <th scope="row"><div class="file"><span class="ext {item.ext === 'PNG' ? 'e-png' : 'e-jpg'}">{item.ext}</span><span><b>{item.name}</b><small>{item.meta}</small></span></div></th>
                <td data-l={t('constat.col.now')}><span class="num">{item.now}</span><span class="wb" aria-hidden="true"><i style={`--w:${item.nowW}`}></i></span></td>
                <td data-l={t('constat.col.next')}><span class="num">{item.next}</span><span class="wb af" aria-hidden="true"><i style={`--w:${item.nextW}`}></i></span></td>
                <td data-l={t('constat.col.save')}><span class="save">{item.save}</span></td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
      <p class="empty" hidden={showcase ? shown.length > 0 : true}>{t('constat.none')}</p>
      <p class="inv-foot"><span>{t('constat.sum.now')} <b>{showcase ? '4,8 Mo' : '–'}</b></span><span>{t('constat.sum.next')} <b>{showcase ? '≈ 440 Ko' : '–'}</b></span><span>{t('constat.sum.save')} <b>{showcase ? '−91 %' : '–'}</b></span></p>
    </section>

    <section class="block" id="plan" aria-labelledby="t-plan" tabindex="-1">
      <p class="kicker">{t('constat.res.k')}</p>
      <h2 class="sec" id="t-plan">{t('constat.res.h')}</h2>
      <p class="sec-lede">{t('constat.res.p')}</p>
      <div class="tabs" role="tablist" aria-label={t('constat.tabs')} id="tabs"><span class="ind" aria-hidden="true"></span>
        <button role="tab" id="tb-cms" type="button" aria-selected={tab === 'cms'} tabindex={tab === 'cms' ? 0 : -1} aria-controls="tp-cms" onclick={() => onTab('cms')}>{t('constat.cms')}</button>
        <button role="tab" id="tb-code" type="button" aria-selected={tab === 'code'} tabindex={tab === 'code' ? 0 : -1} aria-controls="tp-code" onclick={() => onTab('code')}>{t('constat.code')}</button>
      </div>
      <div class="tp" class:show={tab === 'cms'} id="tp-cms" role="tabpanel" aria-labelledby="tb-cms" tabindex="0" hidden={tab !== 'cms'}>
        <ol class="steps">{#each cms as step, i (step[0])}<li class="step rv in" style={`--i:${i}`}><span class="sn" aria-hidden="true">{i + 1}</span><h3><span class="sr-only">{t('constat.step', { n: i + 1 })} </span>{t(step[0])}</h3><p>{t(step[1])}</p><p class="gain">{t(step[2])}</p></li>{/each}</ol>
      </div>
      <div class="tp" class:show={tab === 'code'} id="tp-code" role="tabpanel" aria-labelledby="tb-code" tabindex="0" hidden={tab !== 'code'}>
        <ol class="steps">{#each code as step, i (step[0])}<li class="step rv in" style={`--i:${i}`}><span class="sn" aria-hidden="true">{i + 1}</span><h3><span class="sr-only">{t('constat.step', { n: i + 1 })} </span>{t(step[0])}</h3><p>{t(step[1])}</p><p class="gain">{t(step[2])}</p></li>{/each}</ol>
        <div class="codeb"><div class="ch"><span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>{t('constat.code.file')}</span><button class="btn btn-ghost btn-sm btn-dk" type="button" onclick={onCopy}>{t('constat.copy')}</button></div><pre tabindex="0" aria-label={t('constat.code.name')}><code>{@html pictureHtml}</code></pre></div>
      </div>
    </section>
    {:else}
    <section class="block" id="plan" aria-labelledby="t-plan" tabindex="-1">
      <h2 class="sec" id="t-plan">{row.title}</h2>
      <p>{row.why}</p>
      {#if row.steps.length > 0}
        <ol class="steps">
          {#each row.steps as step, i (step)}
            <li class="step"><span class="sn" aria-hidden="true">{i + 1}</span><p><InlineCode text={step} /></p>{#if row.snippets?.[i]}<pre class="step-code"><code>{row.snippets[i]}</code></pre>{/if}</li>
          {/each}
        </ol>
      {/if}
    </section>
    {/if}

    <section class="block" aria-labelledby="t-brief">
      <div class="card pad rv brief">
        <div>
          <p class="kicker">{t('constat.ai.k')}</p>
          <h2 class="sec" id="t-brief">{t('constat.ai.h')}</h2>
          <p class="lede">{t('constat.ai.p')}</p>
          <div class="hacts"><a class="btn btn-primary" href={briefHref}>{t('constat.ai.cta')}</a></div>
        </div>
        <div class="bp">
          <div class="bh">{t('constat.ai.chip')}</div>
          <div class="bb">{#if constatShowsImageInventory(row.messageKey)}<p>{t('constat.ai.l1')}</p><p>{t('constat.ai.l2')}</p>{:else}<p>{t('constat.ai.any', { domain: name, host })}</p><p>{row.title}</p>{/if}</div>
        </div>
      </div>
    </section>

    <nav class="block pager" aria-label={t('constat.pager', { name })}>
      {#if prev}<a class="pg prev" href={detailHref(auditId, prev.checkId)}><span><small>{t('constat.prev')}</small><b>{prev.title}</b></span></a>{/if}
      <a class="pg mid" href={domainLink}>{t('constat.backdom', { name })}</a>
      {#if next}<a class="pg next" href={detailHref(auditId, next.checkId)}><span><small>{t('constat.next')}</small><b>{next.title}</b></span></a>{/if}
    </nav>
  {/if}
</div>
<p class="sr-only" id="live" role="status" aria-live="polite"></p>
<div class="toast" id="toast" aria-hidden="true"></div>
