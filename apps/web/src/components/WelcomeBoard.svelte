<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { bootEspace } from '../lib/espace-boot.js';
import SessionWall from './SessionWall.svelte';

let mode = $state<
  'pending' | 'out' | 'empty' | 'list' | 'ready' | 'live' | 'error'
>('pending');
let root: HTMLElement | undefined = $state();

onMount(() => {
  const stop = bootEspace(
    'bienvenue',
    (next) => {
      mode = next.mode;
    },
    () => root,
  );
  return () => stop();
});
</script>

<div bind:this={root} data-mode={mode}>
{#if mode === 'pending'}<main id="contenu" hidden><p class="sr-only" role="status">{t('sites.loading')}</p></main>{:else if mode === 'out'}<main id="contenu"><SessionWall title={t('mq.bi.003')} status={t('account.out')} next="/bienvenue" /></main>{:else}
<main id="contenu" tabindex="-1">
<div class="progress" aria-hidden="true"></div>
<nav class="crumbs" aria-label={t('mq.bi.001')}><ol><li><a href="/">{t('mq.bi.002')}</a></li><li><span aria-current="page">{t('mq.bi.003')}</span></li></ol></nav>
<section class="panel bv-hero rv" aria-labelledby="t1"><div class="bv-bg" aria-hidden="true"><i></i><i></i><i></i></div><div class="wb"><div><p class="eyebrow"><span class="dot" aria-hidden="true"></span>{t('mq.bi.004')}</p><h1 id="t1">{t('mq.bi.005')}<span class="bv-name" hidden></span></h1><p class="lede">{t('mq.bi.007')}</p>
<div class="bv-cta"><a class="btn btn-primary" href="/#audit-form">{t('mq.bi.008')}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><a class="btn btn-ghost" href="/sites">{t('mq.bi.009')}</a></div>
<p class="bv-skip">{t('mq.bi.010')}</p></div>
<div class="ring" role="img" aria-label={t('mq.bi.011')} id="ring" style="--pc:0"><svg viewBox="0 0 180 180" aria-hidden="true"><defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#7091E6"/><stop offset="1" stop-color="#3D52A0"/></linearGradient></defs><circle class="bg" cx="90" cy="90" r="80"/><circle class="fg" cx="90" cy="90" r="80"/></svg><div class="lab" aria-hidden="true"><b id="rc">{t('mq.bi.012')}</b><span>{t('mq.bi.013')}</span></div></div></div>
<ol class="bv-trk" aria-label={t('mq.bi.014')}><li data-k="e1"><span class="bv-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></span><span><b>{t('mq.bi.015')}</b><small>{t('mq.bi.016')}</small></span></li><li data-k="e2"><span class="bv-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg></span><span><b>{t('mq.bi.017')}</b><small>{t('mq.bi.018')}</small></span></li><li data-k="e3"><span class="bv-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg></span><span><b>{t('mq.bi.019')}</b><small>{t('mq.bi.020')}</small></span></li></ol></section>
<section class="sec" aria-labelledby="t2"><p class="kicker">{t('mq.bi.021')}</p><h2 id="t2" class="h2">{t('mq.bi.022')}</h2>
<ol class="steps" data-stagger>
<li class="step rv" data-state="current" id="e1" style="--i:1"><div class="num" aria-hidden="true"><span class="n">{t('mq.bi.023')}</span><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></div><div><h3 id="e1-t">{t('mq.bi.024')} <span class="st">{t('mq.bi.025')}</span></h3><p>{t('mq.bi.026')}</p><div class="acts"><a class="btn btn-primary" href="/#audit-form">{t('mq.bi.027')}</a><button class="btn mark" type="button" aria-pressed="false" aria-describedby="e1-t">{t('mq.bi.028')}</button></div></div></li>
<li class="step rv" data-state="todo" id="e2" style="--i:2"><div class="num" aria-hidden="true"><span class="n">{t('mq.bi.029')}</span><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></div><div><h3 id="e2-t">{t('mq.bi.030')} <span class="st">{t('mq.bi.031')}</span></h3><p>{t('mq.bi.032')}</p><div class="acts"><a class="btn btn-primary" href="/verifier">{t('mq.bi.033')}</a><button class="btn mark" type="button" aria-pressed="false" aria-describedby="e2-t">{t('mq.bi.028')}</button></div></div></li>
<li class="step rv" data-state="todo" id="e3" style="--i:3"><div class="num" aria-hidden="true"><span class="n">{t('mq.bi.034')}</span><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></div><div><h3 id="e3-t">{t('mq.bi.035')} <span class="st">{t('mq.bi.031')}</span></h3><p>{t('mq.bi.036')}</p><div class="acts"><a class="btn btn-primary" href="/sites">{t('mq.bi.037')}</a><button class="btn mark" type="button" aria-pressed="false" aria-describedby="e3-t">{t('mq.bi.028')}</button></div></div></li>
</ol>
<p class="done-msg" id="donemsg" hidden>{t('mq.bi.038')}</p>
<div class="note"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg><p>{t('mq.bi.039')}</p></div></section>
<section class="sec" aria-labelledby="t3"><p class="kicker">{t('mq.bi.040')}</p><h2 id="t3" class="h2">{t('mq.bi.041')}</h2>
<ul class="lk-grid">
<li><a class="lk" href="/methode"><span class="lk-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.bi.042')}</span><span class="lk-d">{t('mq.bi.043')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
<li><a class="lk" href="/exemple-rapport"><span class="lk-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.bi.044')}</span><span class="lk-d">{t('mq.bi.045')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
<li><a class="lk" href="/pro"><span class="lk-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.bi.046')}</span><span class="lk-d">{t('mq.bi.047')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
</ul></section>
</main>
{/if}
<div class="toast" id="toast" aria-hidden="true"></div><p class="sr-only" id="live" role="status" aria-live="polite"></p>
</div>
