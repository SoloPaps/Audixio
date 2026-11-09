<script lang="ts">
import { FREE_LINK_CAP, FREE_SITE_CAP, PRO_SITE_CAP } from '@audigy/db';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import type { MesureDomaine } from '../lib/apercu.js';
import { bootEspace, type LiveSite } from '../lib/espace-boot.js';
import { gradeForScore } from '../lib/grade.js';
import { levelForScore, levelLabel } from '../lib/score.js';
import ReputationPanel from './ReputationPanel.svelte';
import SessionWall from './SessionWall.svelte';

let mode = $state<
  'pending' | 'out' | 'empty' | 'list' | 'ready' | 'live' | 'error'
>('pending');
let root: HTMLElement | undefined = $state();
let notice = $state('');
let token = $state('');
let plan = $state<'free' | 'pro'>('free');
let sites = $state<LiveSite[]>([]);

const siteCap = $derived(plan === 'pro' ? PRO_SITE_CAP : FREE_SITE_CAP);
const linkCap = $derived(plan === 'pro' ? null : FREE_LINK_CAP);
const sitesUsed = $derived(sites.length);
const linksUsed = $derived(sites.filter((site) => site.isPublic).length);

onMount(() => {
  const stop = bootEspace(
    'sites',
    (next) => {
      mode = next.mode;
      notice = next.notice;
      token = next.token;
      plan = next.plan;
      sites = next.sites;
    },
    () => root,
  );
  return () => stop();
});

function ratio(used: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, used / max);
}

function letterOf(note: string | null, score: number | null): string | null {
  if (note && /^[A-F]$/.test(note)) return note;
  return gradeForScore(score);
}

function tone(grade: string | null): string {
  if (grade === 'A') return 'g-a';
  if (grade === 'B') return 'g-b';
  if (grade === 'C') return 'g-c';
  return 'g-d';
}

function sitesCaption(used: number, max: number): string {
  if (used === 1) return t('mq.sl.live.sites.one', { max });
  return t('mq.sl.live.sites.sr', { used, max });
}

function linksCaption(used: number, max: number | null): string {
  if (max === null) return t('mq.sl.live.links.pro', { used });
  if (used === 0) return t('mq.sl.live.links.none', { max });
  if (used === 1) return t('mq.sl.live.links.one', { max });
  return t('mq.sl.live.links.sr', { used, max });
}

function publicUrl(site: LiveSite): string {
  if (!site.isPublic || !site.publicSlug) return '';
  return `${location.origin}/score/${site.publicSlug}`;
}

function levelOf(metric: MesureDomaine): string {
  if (metric.locked) return t('mq.sl.live.locked');
  if (metric.score === null) return t('mq.sl.live.none');
  return levelLabel(levelForScore(metric.score));
}
</script>

<div bind:this={root} data-mode={mode}>
{#if mode === 'pending'}
  <main id="contenu" hidden><p class="sr-only" role="status">{t('sites.loading')}</p></main>
{:else if mode === 'out'}
  <main id="contenu" class="wrap">
    <SessionWall title={t('sites.title')} status={t('sites.need_login')} next="/sites" />
  </main>
{:else if mode === 'error'}
  <main id="contenu" class="wrap">
    <h1 id="t">{t('sites.title')}</h1>
    <p role="status">{t('sites.error')}</p>
  </main>
{:else if mode === 'empty'}
<main id="contenu" class="wrap">
<nav class="crumbs fade" aria-label={t('mq.sv.001')}><ol><li><a href="/">{t('mq.sv.002')}</a></li><li aria-current="page">{t('mq.sv.003')}</li></ol></nav>
<section class="hero" aria-labelledby="t">
<div class="empty-art" aria-hidden="true"><span></span><span></span><span></span><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></div>
<span class="chip fade"><i aria-hidden="true"></i>{t('mq.sv.004')}</span>
<h1 id="t" class="fade" style="--d:.1s">{t('mq.sv.005')} <span class="grad">{t('mq.sv.006')}</span></h1>
<p class="lead fade" style="--d:.2s">{t('mq.sv.007')}</p>
<div class="acts fade" style="--d:.3s"><a class="btn btn-primary" href="/#audit-form"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>{t('mq.sv.008')}</a><a class="btn btn-ghost" href="/exemple-rapport">{t('mq.sv.009')}</a></div>
</section>
<section class="sec" aria-labelledby="h-steps"><h2 id="h-steps">{t('mq.sv.010')}</h2>
<ol class="steps">
<li class="panel"><b>{t('mq.sv.011')}</b><h3>{t('mq.sv.012')}</h3><p>{t('mq.sv.013')}</p></li>
<li class="panel"><b>{t('mq.sv.014')}</b><h3>{t('mq.sv.015')}</h3><p>{t('mq.sv.016')}</p></li>
<li class="panel"><b>{t('mq.sv.017')}</b><h3>{t('mq.sv.018')}</h3><p>{t('mq.sv.019')}</p></li>
</ol></section>
<section class="sec" aria-labelledby="h-plus"><h2 id="h-plus">{t('mq.sv.020')}</h2><ul class="lk-grid">
<li><a class="lk" href="/compte/alertes"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.sv.021')}</span><span class="lk-d">{t('mq.sv.022')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
<li><a class="lk" href="/methode"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M19 19v2H6M8 7h7"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.sv.023')}</span><span class="lk-d">{t('mq.sv.024')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
<li><a class="lk" href="/pro"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.sv.025')}</span><span class="lk-d">{t('mq.sv.026')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
</ul></section>
</main>
<div class="toast" role="status" aria-live="polite"></div>
{:else if mode === 'live'}
<main id="contenu" tabindex="-1">
<section class="khero" aria-labelledby="t">
<div class="aurora" aria-hidden="true"><i data-depth=".6"></i><i data-depth="-.4"></i><i data-depth=".3"></i><i data-depth="-.7"></i></div>
<div class="dash-hero">
<div>
<nav aria-label={t('mq.sl.001')}><ol class="crumbs"><li><a href="/">{t('mq.sl.002')}</a></li><li><span aria-current="page">{t('mq.sl.003')}</span></li></ol></nav>
<p class="eyebrow"><span class="dot" aria-hidden="true"></span>{t('mq.sl.004')}</p>
<h1 id="t">{t('mq.sl.005')} <span class="grad-txt">{t('mq.sl.006')}</span></h1>
<p class="lede">{t('mq.sl.009')}</p>
</div>
<div class="gpanel quota in" aria-labelledby="qt">
<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><linearGradient id="rgrad" x1="0" x2="1"><stop offset="0" stop-color="#3D52A0"/><stop offset="1" stop-color="#7091E6"/></linearGradient></defs></svg>
<p class="kicker" id="qt">{plan === 'pro' ? t('mq.sl.live.kicker.pro') : t('mq.sl.010')}</p>
<div class="qrow"><div class="ring" class:full={sitesUsed >= siteCap} style="--p:{ratio(sitesUsed, siteCap)}" aria-hidden="true"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36"/></svg><b><span><span>{t('mq.sl.live.n', { n: sitesUsed })}</span><small>{t('mq.sl.live.of', { n: siteCap })}</small></span></b></div><div><h2>{t('mq.sl.003')}</h2><p><span class="sr-only">{sitesCaption(sitesUsed, siteCap)} </span>{#if sitesUsed >= siteCap}<span class="badge b-chk">{t('mq.sl.014')}</span>{/if}</p></div></div>
<div class="qrow"><div class="ring" class:full={linkCap !== null && linksUsed >= linkCap} style="--p:{linkCap === null ? (linksUsed > 0 ? 1 : 0) : ratio(linksUsed, linkCap)}" aria-hidden="true"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36"/></svg><b><span><span>{t('mq.sl.live.n', { n: linksUsed })}</span>{#if linkCap !== null}<small>{t('mq.sl.live.of', { n: linkCap })}</small>{/if}</span></b></div><div><h2>{t('mq.sl.017')}</h2><p><span class="sr-only">{linksCaption(linksUsed, linkCap)} </span>{#if linkCap !== null && linksUsed >= linkCap}<span class="badge b-chk">{t('mq.sl.014')}</span>{/if}</p></div></div>
{#if plan !== 'pro'}<a class="qlink lk-pill" href="/passer-pro">{t('mq.sl.019')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>{/if}
</div>
</div>
</section>
<section aria-labelledby="add-t" class="card pad">
<h2 id="add-t" class="sr-only">{t('mq.sl.020')}</h2>
<form class="addf" id="addf" novalidate>
<div class="field"><label for="url">{t('mq.sl.021')}</label><div class="inp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg><input id="url" name="url" type="url" inputmode="url" autocomplete="url" placeholder={t('mq.sl.022')} aria-describedby="url-h url-e" required></div><p class="err" id="url-e" aria-live="polite">{notice}</p></div>
<button class="btn btn-primary" type="submit"><span class="bl" style="display:inline-flex;align-items:center;gap:10px"><svg class="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>{t('mq.sl.020')}</span><span class="spin" aria-hidden="true"></span></button>
</form>
<p class="hint" id="url-h">{plan === 'pro' ? t('mq.sl.live.hint.pro', { used: sitesUsed, max: siteCap }) : t('mq.sl.live.hint', { used: sitesUsed, max: siteCap })}</p>
</section>
<section class="block" aria-labelledby="list-t" style="margin-top:var(--s6)">
<p class="kicker">{t('mq.sl.024')}</p><h2 class="sec" id="list-t">{t('mq.sl.025')}</h2>
<div class="sites">
{#each sites as site, index (site.id)}
{@const mark = letterOf(site.grade, site.score)}
{@const eco = letterOf(site.ecologie.note, site.ecologie.score)}
{@const sec = letterOf(site.securite.note, site.securite.score)}
<article class="beam in" aria-labelledby={`s-${site.id}`}>
<div class="site">
<div class="site-top">
<div>
<div class="dom"><span class="fav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg></span><h2 id={`s-${site.id}`}><a href={site.href}>{site.host}</a></h2></div>
<div class="chips">{#if site.verified}<span class="badge b-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('mq.sl.029')}</span>{/if}</div>
{#if site.when}<div class="stamp"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{t('mq.sl.030')} <time>{site.when}</time></span></div>{/if}
</div>
{#if mark && site.score !== null}
<div class="score {tone(mark)}"><span class="glass" aria-hidden="true">{mark}</span><div><p class="k">{t('mq.sl.036')}</p><strong><span class="sr-only">{t('mq.sl.037')} </span>{t('mq.sl.live.grade', { grade: mark, label: levelLabel(levelForScore(site.score)) })} {t('mq.sl.live.score', { score: Math.round(site.score) })}</strong><div class="gbar" aria-hidden="true"><i style="--v:{site.score / 100}"></i></div></div></div>
{:else}
<div class="score g-d"><span class="glass" aria-hidden="true">–</span><div><p class="k">{t('mq.sl.036')}</p><strong>{t('mq.sl.live.none')}</strong></div></div>
{/if}
</div>
<div class="metrics">
<div class="met"><p class="met-h"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3L5 13h6l-1 8 8-10h-6z"/></svg></span>{t('mq.sl.039')}</p><p class="v">{#if site.performance.score !== null}{t('mq.sl.live.score', { score: Math.round(site.performance.score) })}{:else}{t('mq.sl.live.none')}{/if} <span class="badge" class:b-ok={site.performance.score !== null && site.performance.score >= 80} class:b-nt={site.performance.score === null || site.performance.score < 80}>{levelOf(site.performance)}</span></p>{#if site.performance.score !== null}<div class="gauge" aria-hidden="true"><i style="--x:{Math.round(site.performance.score)}%"></i></div>{/if}<p style="margin-top:10px">{t('mq.sl.042')}</p></div>
<div class="met {eco ? tone(eco) : ''}"><p class="met-h"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/></svg></span>{t('mq.sl.043')}</p><p class="v">{#if eco}<span class="gchip">{eco}</span>{/if} {levelOf(site.ecologie)} {#if site.ecologie.score !== null}<small>{t('mq.sl.live.index', { score: Math.round(site.ecologie.score) })}</small>{/if}</p>{#if site.ecologie.score !== null}<div class="gbar" aria-hidden="true"><i style="--v:{site.ecologie.score / 100}"></i></div>{/if}<p style="margin-top:10px">{t('mq.sl.046')}</p></div>
<div class="met"><p class="met-h"><span class="ico" class:lockd={site.securite.locked}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg></span>{t('mq.sl.047')}</p><p class="v">{#if site.securite.locked}{t('mq.sl.live.locked')}{:else if sec}{sec} <span class="badge b-ok">{levelOf(site.securite)}</span>{#if site.securite.score !== null} <small data-score-num>{Math.round(site.securite.score)}{t('gauge.denom')}</small>{/if}{:else}{t('mq.sl.live.none')}{/if}</p><p>{t('mq.sl.051')}</p></div>
</div>
<div class="acts">
<button class="btn btn-ghost btn-sm" type="button" id={index === 0 ? 'rerun' : undefined}><svg class="r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg><span class="bl">{t('mq.sl.052')}</span></button>
<a class="btn btn-ghost btn-sm" href={site.verify}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>{site.verified ? t('mq.sl.053') : t('sites.verify')}</a>
<a class="btn btn-ghost btn-sm" href="/compte#acces-partages" aria-label={t('mq.sl.live.access', { host: site.host })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>{t('mq.sl.055')}<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
<a class="btn btn-ghost btn-sm" href={`/compte/alertes?site=${encodeURIComponent(site.id)}`} aria-label={t('mq.sl.live.alerts', { host: site.host })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/></svg>{t('mq.sl.057')}</a>
<a class="btn btn-ghost btn-sm" href={`/historique?site=${encodeURIComponent(site.id)}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-6"/></svg>{t('mq.sl.058')} <span class="pro">{t('mq.sl.059')}</span></a>
<span class="sp" aria-hidden="true"></span>
<div class="menu"><button class="btn btn-ghost btn-sm" type="button" id={index === 0 ? 'expb' : undefined} aria-expanded="false" aria-controls={index === 0 ? 'expm' : undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>{t('mq.sl.060')}</button>
<ul id={index === 0 ? 'expm' : undefined} hidden><li><button type="button" data-fmt="PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>{t('mq.sl.061')}</button></li><li><button type="button" data-fmt="Markdown"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 8l-5 4 5 4M16 8l5 4-5 4M13 5l-2 14"/></svg>{t('mq.sl.062')}</button></li><li><button type="button" data-fmt="HTML"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 8l-5 4 5 4M16 8l5 4-5 4M13 5l-2 14"/></svg>{t('mq.sl.063')}</button></li></ul></div>
<a class="btn btn-primary btn-sm" href={site.href}>{t('mq.sl.064')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
</div>
<div class="share">
<div class="cd" style="--p:{linkCap === null ? (linksUsed > 0 ? 1 : 0) : ratio(linksUsed, linkCap)}" aria-hidden="true"><svg viewBox="0 0 70 70"><circle class="bg" cx="35" cy="35" r="30"/><circle class="fg" cx="35" cy="35" r="30"/></svg><b><span><span>{t('mq.sl.live.n', { n: linksUsed })}</span>{#if linkCap !== null}<small>{t('mq.sl.live.of', { n: linkCap })}</small>{/if}</span></b></div>
<div><h3>{t('mq.sl.017')}</h3><p>{#if site.isPublic && publicUrl(site)}{t('mq.sl.live.share.on', { url: publicUrl(site) })}{:else if linkCap === null}{t('mq.sl.live.share.pro', { used: linksUsed })}{:else}{t('mq.sl.live.share.none', { used: linksUsed, max: linkCap })}{/if}</p><div class="tags"><span>{t('mq.sl.068')}</span><span>{t('mq.sl.069')}</span><span>{t('mq.sl.070')}</span></div></div>
<div class="sb">{#if site.isPublic && publicUrl(site)}<button class="btn btn-ghost btn-sm cp" type="button" data-copy={publicUrl(site)} data-msg={t('mq.sl.071')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg><span class="bl">{t('mq.sl.072')}</span></button><button class="btn btn-ghost btn-sm" type="button" data-unpublish={site.id}>{t('sites.unpublish')}</button>{:else}<button class="btn btn-primary btn-sm" type="button" data-pro={linkCap !== null && linksUsed >= linkCap ? 'liens' : undefined} data-publish={linkCap !== null && linksUsed >= linkCap ? undefined : site.id}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>{t('mq.sl.079')}</button>{/if}</div>
</div>
{#if site.places}
<details class="site-actions"><summary>{t('sites.actions')}</summary>
<ReputationPanel siteId={site.id} token={token} place={site.place} />
</details>
{/if}
</div>
</article>
{/each}
</div>
</section>
<section class="block info" aria-label={t('mq.sl.080')}>
<div class="card pad"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></span><h2>{t('mq.sl.081')}</h2>
<ul class="ticks"><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg><span>{t('mq.sl.082')}</span></li><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg><span>{t('mq.sl.083')}</span></li><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg><span>{t('mq.sl.084')}</span></li></ul></div>
<div class="card pad"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01"/></svg></span><h2>{t('mq.sl.085')}</h2>
<p>{t('mq.sl.086')}</p>
<div class="norms"><span class="chip">{t('mq.sl.087')}</span><span class="chip">{t('mq.sl.088')}</span></div>
<a class="qlink lk-pill" href="/methode">{t('mq.sl.089')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>
</section>
{#if plan !== 'pro'}
<section class="block" aria-labelledby="pro-t">
<div class="pzw"><div class="pin2"><div class="stars" aria-hidden="true"><i style="left:8%;top:22%"></i><i style="left:30%;top:78%;animation-delay:1s"></i><i style="left:62%;top:16%;animation-delay:2s"></i><i style="left:88%;top:70%;animation-delay:.5s"></i><i style="left:48%;top:50%;animation-delay:1.6s"></i></div>
<div><span class="pb"><span class="up">{t('mq.sl.090')}</span></span><h2 id="pro-t">{t('mq.sl.091')}</h2><p>{t('mq.sl.092')}</p><p class="soon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{t('mq.sl.093')}</p></div>
<a class="btn btn-gold" href="/pro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/></svg>{t('mq.sl.094')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div></div>
</section>
{/if}
</main>
{:else}
<main id="contenu" tabindex="-1">
<section class="khero" aria-labelledby="t">
<div class="aurora" aria-hidden="true"><i data-depth=".6"></i><i data-depth="-.4"></i><i data-depth=".3"></i><i data-depth="-.7"></i></div>
<div class="dash-hero">
<div data-stagger>
<nav aria-label={t('mq.sl.001')} class="rv"><ol class="crumbs"><li><a href="/">{t('mq.sl.002')}</a></li><li><span aria-current="page">{t('mq.sl.003')}</span></li></ol></nav>
<p class="eyebrow rv"><span class="dot" aria-hidden="true"></span>{t('mq.sl.004')}</p>
<h1 class="rv" id="t">{t('mq.sl.005')} <span class="grad-txt">{t('mq.sl.006')}</span></h1><p style="margin:0 0 12px"><a class="btn btn-ghost btn-sm" href="/compte#acces-partages" aria-label={t('mq.sl.007')}>{t('mq.sl.008')}</a></p>
<p class="lede rv">{t('mq.sl.009')}</p>
</div>
<div class="gpanel rv quota" aria-labelledby="qt">
<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><linearGradient id="rgrad" x1="0" x2="1"><stop offset="0" stop-color="#3D52A0"/><stop offset="1" stop-color="#7091E6"/></linearGradient></defs></svg>
<p class="kicker" id="qt">{t('mq.sl.010')}</p>
<div class="qrow"><div class="ring full" style="--p:1" aria-hidden="true"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36"/></svg><b><span><span data-count="2">{t('mq.sl.011')}</span><small> {t('mq.sl.012')}</small></span></b></div><div><h2>{t('mq.sl.003')}</h2><p><span class="sr-only">{t('mq.sl.013')} </span><span class="badge b-chk">{t('mq.sl.014')}</span></p></div></div>
<div class="qrow"><div class="ring full" style="--p:1" aria-hidden="true"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36"/></svg><b><span><span data-count="1">{t('mq.sl.015')}</span><small> {t('mq.sl.016')}</small></span></b></div><div><h2>{t('mq.sl.017')}</h2><p><span class="sr-only">{t('mq.sl.018')} </span><span class="badge b-chk">{t('mq.sl.014')}</span></p></div></div>
<a class="qlink lk-pill" href="/passer-pro">{t('mq.sl.019')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
</div>
</div>
</section>

<section aria-labelledby="add-t" class="card pad rv">
<h2 id="add-t" class="sr-only">{t('mq.sl.020')}</h2>
<form class="addf" id="addf" novalidate>
<div class="field"><label for="url">{t('mq.sl.021')}</label><div class="inp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg><input id="url" name="url" type="url" inputmode="url" autocomplete="url" placeholder={t('mq.sl.022')} aria-describedby="url-h url-e" required></div><p class="err" id="url-e" aria-live="polite"></p></div>
<button class="btn btn-primary" type="submit"><span class="bl" style="display:inline-flex;align-items:center;gap:10px"><svg class="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>{t('mq.sl.020')}</span><span class="spin" aria-hidden="true"></span></button>
</form>
<p class="hint" id="url-h">{t('mq.sl.023')}</p>
</section>

<section class="block" aria-labelledby="list-t" style="margin-top:var(--s6)">
<p class="kicker rv">{t('mq.sl.024')}</p><h2 class="sec rv" id="list-t">{t('mq.sl.025')}</h2>
<div class="sites">
<article class="beam rv" aria-labelledby="s1">
<div class="site">
<div class="site-top">
<div>
<div class="dom"><span class="fav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg></span><h2 id="s1"><a href="https://monsite-exemple.fr" rel="noopener">{t('mq.sl.026')}<span class="sr-only"> {t('mq.sl.027')}</span></a></h2></div>
<div class="chips"><span class="chip"><span class="pulse" aria-hidden="true"></span>{t('mq.sl.028')}</span><span class="badge b-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('mq.sl.029')}</span></div>
<div class="stamp"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{t('mq.sl.030')} <time datetime="2026-05-18T09:15+02:00">{t('mq.sl.031')}</time> {t('mq.sl.032')}</span><span>{t('mq.sl.033')} <code>{t('mq.sl.034')}</code></span></div>
</div>
<div class="score g-b"><span class="glass" aria-hidden="true">{t('mq.sl.035')}</span><div><p class="k">{t('mq.sl.036')}</p><strong><span class="sr-only">{t('mq.sl.037')} </span>{t('mq.sl.038')}</strong><div class="gbar" aria-hidden="true"><i style="--v:.84"></i></div></div></div>
</div>
<div class="metrics" data-stagger>
<div class="met rv"><p class="met-h"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3L5 13h6l-1 8 8-10h-6z"/></svg></span>{t('mq.sl.039')}</p><p class="v">{t('mq.sl.040')} <span class="badge b-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('mq.sl.041')}</span></p><div class="gauge" aria-hidden="true"><i style="--x:18%"></i></div><p style="margin-top:10px">{t('mq.sl.042')}</p></div>
<div class="met rv g-b"><p class="met-h"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/></svg></span>{t('mq.sl.043')}</p><p class="v"><span class="gchip">{t('mq.sl.035')}</span> {t('mq.sl.044')} <small>{t('mq.sl.045')}</small></p><div class="gbar" aria-hidden="true"><i style="--v:.72"></i></div><p style="margin-top:10px">{t('mq.sl.046')}</p></div>
<div class="met rv"><p class="met-h"><span class="ico lockd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg></span>{t('mq.sl.047')}</p><p class="v">{t('mq.sl.048')} <small>{t('mq.sl.049')}</small> <span class="badge b-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('mq.sl.050')}</span></p><p>{t('mq.sl.051')}</p></div>
</div>
<div class="acts">
<button class="btn btn-ghost btn-sm" type="button" id="rerun"><svg class="r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg><span class="bl">{t('mq.sl.052')}</span></button>
<a class="btn btn-ghost btn-sm" href="/verifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>{t('mq.sl.053')}</a>
<a class="btn btn-ghost btn-sm" href="/compte#acces-partages" aria-label={t('mq.sl.054')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>{t('mq.sl.055')}<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><a class="btn btn-ghost btn-sm" href="/compte/alertes" aria-label={t('mq.sl.056')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/></svg>{t('mq.sl.057')}</a>
<a class="btn btn-ghost btn-sm" href="/historique"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-6"/></svg>{t('mq.sl.058')} <span class="pro">{t('mq.sl.059')}</span></a>
<span class="sp" aria-hidden="true"></span>
<div class="menu"><button class="btn btn-ghost btn-sm" type="button" id="expb" aria-expanded="false" aria-controls="expm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>{t('mq.sl.060')}</button>
<ul id="expm" hidden><li><button type="button" data-fmt="PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>{t('mq.sl.061')}</button></li><li><button type="button" data-fmt="Markdown"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 8l-5 4 5 4M16 8l5 4-5 4M13 5l-2 14"/></svg>{t('mq.sl.062')}</button></li><li><button type="button" data-fmt="HTML"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 8l-5 4 5 4M16 8l5 4-5 4M13 5l-2 14"/></svg>{t('mq.sl.063')}</button></li></ul></div>
<a class="btn btn-primary btn-sm" href="/rapport">{t('mq.sl.064')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
</div>
<div class="share" id="share">
<div class="cd" style="--p:.6" aria-hidden="true"><svg viewBox="0 0 70 70"><circle class="bg" cx="35" cy="35" r="30"/><circle class="fg" cx="35" cy="35" r="30"/></svg><b><span><span data-count="18">{t('mq.sl.065')}</span><small>{t('mq.sl.066')}</small></span></b></div>
<div><h3><span class="pulse" aria-hidden="true"></span>{t('mq.sl.017')}</h3><p>{t('mq.sl.067')}</p><div class="tags"><span>{t('mq.sl.068')}</span><span>{t('mq.sl.069')}</span><span>{t('mq.sl.070')}</span></div></div>
<div class="sb"><button class="btn btn-ghost btn-sm cp" type="button" data-copy="https://audixio.fr/partage/Exemple" data-msg={t('mq.sl.071')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg><span class="bl">{t('mq.sl.072')}</span></button><button class="btn btn-warn btn-sm" type="button" id="withdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg><span class="bl">{t('mq.sl.073')}</span></button></div>
</div>
</div>
</article>

<article class="beam rv site2 slim" aria-labelledby="s2">
<div class="site">
<div class="site-top"><div>
<div class="dom"><span class="fav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg></span><h2 id="s2"><a href="https://boutique.exemple.fr" rel="noopener">{t('mq.sl.074')}<span class="sr-only"> {t('mq.sl.027')}</span></a></h2></div>
<div class="chips"><span class="badge b-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('mq.sl.029')}</span></div>
<div class="stamp"><span>{t('mq.sl.075')}</span></div>
<p class="limitn"><span class="dotl" aria-hidden="true"></span>{t('mq.sl.076')}</p>
</div></div>
<div class="acts">
<a class="btn btn-ghost btn-sm" href="/verifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></svg>{t('mq.sl.053')}</a>
<a class="btn btn-ghost btn-sm" href="/compte#acces-partages" aria-label={t('mq.sl.077')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>{t('mq.sl.055')}<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><a class="btn btn-ghost btn-sm" href="/compte/alertes" aria-label={t('mq.sl.078')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/></svg>{t('mq.sl.057')}</a>
<span class="sp" aria-hidden="true"></span>
<button class="btn btn-primary btn-sm" type="button" data-pro="liens"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>{t('mq.sl.079')}</button>
</div>
</div>
</article>
</div>
</section>

<section class="block info" aria-label={t('mq.sl.080')} data-stagger>
<div class="card pad rv"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></span><h2>{t('mq.sl.081')}</h2>
<ul class="ticks"><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg><span>{t('mq.sl.082')}</span></li><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg><span>{t('mq.sl.083')}</span></li><li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg><span>{t('mq.sl.084')}</span></li></ul></div>
<div class="card pad rv"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01"/></svg></span><h2>{t('mq.sl.085')}</h2>
<p>{t('mq.sl.086')}</p>
<div class="norms"><span class="chip">{t('mq.sl.087')}</span><span class="chip">{t('mq.sl.088')}</span></div>
<a class="qlink lk-pill" href="/methode">{t('mq.sl.089')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>
</section>

<section class="block rv" aria-labelledby="pro-t">
<div class="pzw"><div class="pin2"><div class="stars" aria-hidden="true"><i style="left:8%;top:22%"></i><i style="left:30%;top:78%;animation-delay:1s"></i><i style="left:62%;top:16%;animation-delay:2s"></i><i style="left:88%;top:70%;animation-delay:.5s"></i><i style="left:48%;top:50%;animation-delay:1.6s"></i></div>
<div><span class="pb"><span class="up">{t('mq.sl.090')}</span></span><h2 id="pro-t">{t('mq.sl.091')}</h2><p>{t('mq.sl.092')}</p><p class="soon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{t('mq.sl.093')}</p></div>
<a class="btn btn-gold" href="/pro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/></svg>{t('mq.sl.094')} <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div></div>
</section>
</main>

{/if}
<div class="pm" id="pro-modal" hidden>
<div class="pm-scrim" data-close aria-hidden="true"></div>
<div class="pm-dlg" role="dialog" aria-modal="true" aria-labelledby="pm-t" aria-describedby="pm-d" tabindex="-1">
<button class="pm-x" type="button" data-close aria-label={t('mq.sl.095')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
<div id="pm-main">
<div class="pm-top st" style="--i:0"><span class="pm-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15.6 6.6 18.5l1.2-6L3.3 8.3l6.1-.7z"/></svg></span>
<div><span class="badge"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15.6 6.6 18.5l1.2-6L3.3 8.3l6.1-.7z"/></svg><span class="up">{t('mq.sl.090')}</span></span><span class="soon">{t('mq.sl.093')}</span></div></div>
<h2 id="pm-t" class="st" style="--i:1">{t('mq.sl.096')}</h2>
<p id="pm-d" class="pm-d st" style="--i:2"></p>
<div class="meter st" style="--i:3"><div class="lab"><span id="pm-ml"></span><span id="pm-mv"></span></div><div class="bar" aria-hidden="true"><i></i></div></div>
<h3 class="st" style="--i:4">{t('mq.sl.097')}</h3>
<ul class="feats">
<li class="st" style="--i:5"><span class="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></span><span>{t('mq.sl.098')}<small>{t('mq.sl.099')}</small></span></li>
<li class="st" style="--i:6"><span class="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></span><span>{t('mq.sl.100')}<small>{t('mq.sl.101')}</small></span></li>
<li class="st" style="--i:7"><span class="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></span><span>{t('mq.sl.102')}<small>{t('mq.sl.103')}</small></span></li>
<li class="st" style="--i:8"><span class="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></span><span>{t('mq.sl.104')}<small>{t('mq.sl.105')}</small></span></li>
</ul>
<p class="free st" style="--i:9">{t('mq.sl.106')}</p>
<form class="wlf st" style="--i:10" id="pm-form" novalidate>
<label for="pm-email">{t('mq.sl.107')}</label>
<div class="wrow" id="pm-row"><input id="pm-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder={t('mq.sl.108')} aria-describedby="pm-hint pm-err" required>
<button class="btn btn-primary" type="submit" id="pm-sub"><span class="bl">{t('mq.sl.109')}</span><svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg><span class="spin" aria-hidden="true"></span></button></div>
<p class="err" id="pm-err"></p>
<p class="hint" id="pm-hint">{t('mq.sl.110')}</p>
</form>
<div class="later st" style="--i:11"><button class="btn btn-text" type="button" data-close>{t('mq.sl.111')}</button><a class="lk-pill" href="/passer-pro">{t('mq.passer.002')}</a></div>
</div>
<div class="okv" id="pm-ok" tabindex="-1" hidden>
<div class="okc" aria-hidden="true"><svg viewBox="0 0 84 84" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle class="bg" cx="42" cy="42" r="38"/><circle class="c" cx="42" cy="42" r="38"/><path class="k" d="M27 43l10 10 21-22"/></svg><span class="ring"></span></div>
<h2 id="pm-okt">{t('mq.sl.112')}</h2>
<p>{t('mq.sl.113')} <b id="pm-okmail"></b> {t('mq.sl.114')}</p>
<button class="btn btn-primary" type="button" data-close>{t('mq.sl.115')}</button>
</div>
</div></div>
<div class="toast" id="toast" aria-hidden="true"></div><p class="sr-only" id="live" role="status" aria-live="polite"></p>
</div>
