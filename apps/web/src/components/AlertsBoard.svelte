<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { bootEspace } from '../lib/espace-boot.js';
import SessionWall from './SessionWall.svelte';

interface Props {
  /** Section #alertes de /compte : pas de <main>, titre de niveau 2, sans fil d’Ariane ni liens vers le compte. */
  embedded?: boolean;
}

let { embedded = false }: Props = $props();

let mode = $state<
  'pending' | 'out' | 'empty' | 'list' | 'ready' | 'live' | 'error'
>('pending');
let root: HTMLElement | undefined = $state();

onMount(() => {
  const stop = bootEspace(
    'alertes',
    (next) => {
      mode = next.mode;
    },
    () => root,
  );
  return () => stop();
});
</script>

<div bind:this={root} data-mode={mode}>
{#if mode === 'pending'}{#if embedded}<p class="sr-only" role="status">{t('sites.loading')}</p>{:else}<main id="contenu" class="wrap" hidden><p class="sr-only" role="status">{t('sites.loading')}</p></main>{/if}{:else if mode === 'out'}{#if !embedded}<main id="contenu" class="wrap"><SessionWall title={`${t('mq.al.005')} ${t('mq.al.006')}`} status={t('sites.need_login')} next="/compte#alertes" /></main>{/if}{:else}
<svelte:element this={embedded ? 'div' : 'main'} id={embedded ? undefined : 'contenu'} class="wrap">
{#if !embedded}<nav class="crumbs fade" aria-label={t('mq.al.001')}><ol><li><a href="/">{t('mq.al.002')}</a></li><li><a href="/compte">{t('mq.al.003')}</a></li><li aria-current="page">{t('mq.al.004')}</li></ol></nav>{/if}
<section class="hero" aria-labelledby="t">

<div class="badge-ic"><svg viewBox="0 0 24 24" focusable="false"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/></svg></div>
<svelte:element this={embedded ? 'h2' : 'h1'} id="t" class="fade al-t" style="--d:.1s">{t('mq.al.005')} <span class="grad">{t('mq.al.006')}</span></svelte:element>
<p class="lead fade" style="--d:.2s">{t('mq.al.007')} <b>{t('mq.al.008')}</b>{t('mq.al.009')}</p>
</section>

<section class="sec" aria-labelledby="h-base"><h2 id="h-base">{t('mq.al.010')}</h2><p class="sub">{t('mq.al.011')}</p>
<div class="panel"><ul class="rows">
<li class="row"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg><div><b>{t('mq.al.012')}</b><span>{t('mq.al.013')}</span></div><span class="val">{t('mq.al.014')}</span></li>
<li class="row"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg><div><b>{t('mq.al.015')}</b><span>{t('mq.al.016')}</span></div><span class="val">{t('mq.al.017')}</span></li>
<li class="row"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg><div><b>{t('mq.al.018')}</b><span>{t('mq.al.019')}</span></div><span class="val">{t('mq.al.020')}</span></li>
<li class="row"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><div><b>{t('mq.al.021')}</b><span>{t('mq.al.022')}</span></div><span class="val">{t('mq.al.023')}</span></li>
</ul></div></section>

<section class="sec" aria-labelledby="h-pro"><h2 id="h-pro">{t('mq.al.024')} <span class="pb">{t('mq.al.025')}</span></h2><p class="sub">{t('mq.al.026')}</p>
<div class="gate locked" id="gate">
<form class="panel gate-in" id="fPro" inert>
<div class="ctl"><label class="lbl" for="drop">{t('mq.al.027')}</label><span class="hint">{t('mq.al.028')} <output id="dropv" for="drop">{t('mq.al.029')}</output> {t('mq.al.030')}</span><input type="range" id="drop" min="1" max="30" value="5"></div>
<div class="ctl"><label class="lbl" for="ssl">{t('mq.al.031')}</label><select class="inp" id="ssl"><option value="7">{t('mq.al.032')}</option><option value="14">{t('mq.al.014')}</option><option value="30" selected>{t('mq.al.033')}</option><option value="60">{t('mq.al.034')}</option></select></div>
<fieldset class="ctl"><legend class="lbl">{t('mq.al.035')}</legend><div class="radios">
<label><input type="radio" name="fq" value="j"><span>{t('mq.al.036')}</span></label><label><input type="radio" name="fq" value="h" checked><span>{t('mq.al.037')}</span></label><label><input type="radio" name="fq" value="m"><span>{t('mq.al.023')}</span></label></div></fieldset>
<div class="ctl sw-row"><div><span class="lbl" id="dg-l">{t('mq.al.038')}</span><span class="hint" id="dg-d">{t('mq.al.039')}</span></div><span class="sw" role="switch" aria-checked="true" aria-disabled="true" aria-labelledby="dg-l" aria-describedby="dg-d"><i></i></span></div>
<div class="acts" style="justify-content:flex-start"><button class="btn btn-primary" type="submit">{t('mq.al.040')}</button></div>
</form>
<div class="gate-cta" id="gateCta"><div class="badge-ic" style="width:56px;height:56px;margin-bottom:12px"><svg viewBox="0 0 24 24" focusable="false"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div><h3>{t('mq.al.041')}</h3><p>{t('mq.al.042')}</p><a class="btn btn-primary" href="/pro">{t('mq.al.043')} <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>
</div></section>

{#if !embedded}<section class="sec" aria-labelledby="h-l"><h2 id="h-l">{t('mq.al.044')}</h2><ul class="lk-grid">
<li><a class="lk" href="/sites"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.al.045')}</span><span class="lk-d">{t('mq.al.046')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
<li><a class="lk" href="/compte"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span><span class="lk-tx"><span class="lk-t">{t('mq.al.047')}</span><span class="lk-d">{t('mq.al.048')}</span></span><svg class="lk-ar" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></li>
</ul></section>{/if}
</svelte:element>
{#if !embedded}<div class="toast" id="toast" aria-hidden="true"></div><p class="sr-only" id="live" role="status" aria-live="polite"></p>{/if}
{/if}
</div>
