<script lang="ts">
import { onMount, tick } from 'svelte';
import { t } from '../i18n/index.js';
import { bootEspace } from '../lib/espace-boot.js';
import AlertsBoard from './AlertsBoard.svelte';
import SessionWall from './SessionWall.svelte';

let mode = $state<
  'pending' | 'out' | 'empty' | 'list' | 'ready' | 'live' | 'error'
>('pending');
let plan = $state<'free' | 'pro'>('free');
let root: HTMLElement | undefined = $state();

onMount(() => {
  const stop = bootEspace(
    'compte',
    (next) => {
      mode = next.mode;
      plan = next.plan;
    },
    () => root,
  );
  return () => stop();
});

// Le saut natif vers #ancre (ex. /compte#acces-partages depuis /sites) a lieu avant
// l’affichage du compte : on le refait une fois la section rendue.
let anchored = false;
$effect(() => {
  if (anchored || mode === 'pending' || mode === 'out') return;
  anchored = true;
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  void tick().then(() => {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  });
});
</script>

<div bind:this={root} data-mode={mode}>
{#if mode === 'pending'}<main id="contenu" hidden><p class="sr-only" role="status">{t('sites.loading')}</p><section id="contact" hidden></section><section id="profil" hidden></section><section id="alertes" hidden></section><section id="abonnement" hidden></section></main>{:else if mode === 'out'}<main id="contenu"><SessionWall title={t('account.title')} lead={t('account.lead')} status={t('account.out')} next="/compte" /><section id="contact" hidden></section><section id="profil" hidden></section><section id="alertes" hidden></section><section id="abonnement" hidden></section></main>{:else}
<main id="contenu" tabindex="-1">

<section class="khero" id="profil" aria-labelledby="h1" data-dock-hide><div class="aurora" aria-hidden="true" data-depth="-.6"><i></i><i></i><i></i><i></i></div>
<div class="hgrid">
<div class="layer" data-depth=".15">
<p class="eyebrow"><span class="dot" aria-hidden="true"></span>{t('mq.co.001')}</p>
<h1 id="h1">{t('mq.co.002')} <span class="grad-txt">{t('mq.co.003')}</span></h1>
<p class="lede">{t('mq.co.004')}</p>
<nav class="qnav" aria-label={t('mq.co.005')}><a href="#integrations">{t('mq.co.006')}</a><a href="#acces-partages">{t('mq.co.007')}</a><a href="#conditions">{t('mq.co.008')}</a><a href="#export">{t('mq.co.009')}</a><a href="#contact">{t('mq.co.010')}</a><a href="#danger">{t('mq.co.011')}</a></nav>
</div>
<div class="gpanel layer idc rv in" data-depth=".35">
<div class="who"><div class="av" aria-hidden="true"><span>{t('mq.co.012')}</span></div><div><p class="sr-only">{t('mq.co.013')}</p><p class="em">{t('mq.co.014')}<wbr>{t('mq.co.015')}</p><p class="st"><span class="ok-chip"><i class="pulse" aria-hidden="true"></i>{t('mq.co.016')}</span>{t('mq.co.017')}</p></div></div>
<div class="gz"><div class="ring" style="--v:.6667" role="img" aria-label={t('mq.co.018')}><svg viewBox="0 0 132 132" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7091E6"/><stop offset="1" stop-color="#3D52A0"/></linearGradient></defs><circle class="bg" cx="66" cy="66" r="54"/><circle class="fg" cx="66" cy="66" r="54"/></svg><div class="n" aria-hidden="true"><b><span data-count="2">{t('mq.co.019')}</span>{t('mq.co.020')}</b><small>{t('mq.co.021')}</small></div></div>
<ul class="chk"><li><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></i>{t('mq.co.022')}</li><li><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></i>{t('mq.co.023')}</li><li class="todo"><i><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></i><a href="#integrations">{t('mq.co.024')}</a></li></ul></div>
<div class="idf"><span>{t('mq.co.025')}</span><button type="button" class="btn btn-ghost btn-sm" id="lo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg><span class="bl">{t('mq.co.026')}</span><span class="spin" aria-hidden="true"></span></button></div>
</div></div></section>

<nav class="ct-tabs" aria-label={t('ct.tabs.label')}><ol><li><a class="ct-tab" href="#profil"><span aria-hidden="true">01</span>{t('ct.tab.profil')}</a></li><li><a class="ct-tab" href="#alertes"><span aria-hidden="true">02</span>{t('ct.tab.alertes')}</a></li><li><a class="ct-tab" href="#abonnement"><span aria-hidden="true">03</span>{t('ct.tab.abonnement')}</a></li></ol></nav>
<section class="blk al" id="alertes" aria-labelledby="t"><AlertsBoard embedded /></section>
<section class="blk" id="integrations" aria-labelledby="hi"><p class="kicker">{t('mq.co.027')}</p>
<h2 class="sec" id="hi">{t('mq.co.028')}</h2>
<p class="sec-lede">{t('mq.co.029')}</p>
<div class="bento">
<div class="card box c5 rv sheen tilt"><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/></svg></div><p class="sub">{t('mq.co.030')}</p><h3>{t('mq.co.031')}</h3><p>{t('mq.co.032')}</p>
<div class="gsc"><div class="l"><span class="gl"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#fbbc05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg></span><div><b>{t('mq.co.033')}</b><small>{t('mq.co.034')}</small></div></div><button type="button" class="btn btn-primary btn-sm" id="gsc"><span class="bl">{t('mq.co.035')}</span><span class="spin" aria-hidden="true"></span></button></div>
<p class="fine" id="gscm">{t('mq.co.036')}</p></div>
<div class="card box c7 rv"><p class="sub">{t('mq.co.037')}</p><h3>{t('mq.co.038')}</h3><p>{t('mq.co.039')}</p>
<div class="cms" data-stagger><div class="cm rv"><span class="lg" style="background:#21759B" aria-hidden="true">{t('mq.co.040')}</span><div><b>{t('mq.co.041')} <span class="soon">{t('mq.co.042')}</span></b><small>{t('mq.co.043')}</small></div></div><div class="cm rv"><span class="lg" style="background:#5E8E3E" aria-hidden="true">{t('mq.co.044')}</span><div><b>{t('mq.co.045')} <span class="soon">{t('mq.co.042')}</span></b><small>{t('mq.co.046')}</small></div></div><div class="cm rv"><span class="lg" style="background:#0b1220" aria-hidden="true">{t('mq.co.047')}</span><div><b>{t('mq.co.048')} <span class="soon">{t('mq.co.042')}</span></b><small>{t('mq.co.049')}</small></div></div><div class="cm rv"><span class="lg" style="background:#222" aria-hidden="true">{t('mq.co.050')}</span><div><b>{t('mq.co.051')} <span class="soon">{t('mq.co.042')}</span></b><small>{t('mq.co.052')}</small></div></div><div class="cm rv"><span class="lg" style="background:#4353FF" aria-hidden="true">{t('mq.co.053')}</span><div><b>{t('mq.co.054')} <span class="soon">{t('mq.co.042')}</span></b><small>{t('mq.co.055')}</small></div></div></div>
<p class="static"><span aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span><span><b>{t('mq.co.056')}</b> {t('mq.co.057')}</span></p></div>
</div></section>

<section class="blk" id="acces-partages" aria-labelledby="hap"><p class="kicker rv2">{t('mq.co.058')}</p>
<div class="ap-head"><div><h2 class="sec rv2" style="--i:1" id="hap">{t('mq.co.007')}</h2>
<p class="sec-lede rv2" style="--i:2;margin-bottom:0">{t('mq.co.059')}</p></div>
<p class="ap-cap rv2" style="--i:3"><span>{t('mq.co.060')} <b><span id="apn">0</span><span id="apd">{t('mq.co.062')}</span></b></span><span class="ap-meter" aria-hidden="true"><i id="apm"></i></span><span class="sr-only">{t('mq.co.063')}</span></p></div>
<div class="card rv2" style="--i:2">
<ul class="ap-types" aria-label={t('mq.co.064')}><li><b>{t('mq.co.065')}</b> {t('mq.co.066')}</li><li><b>{t('mq.co.067')}</b> {t('mq.co.068')}</li></ul>
<ul class="ap-list" id="apl" aria-label={t('mq.co.069')}></ul>
<div class="ap-empty" id="ape"><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg></div><h3 id="apeh" tabindex="-1">{t('mq.co.082')}</h3><p>{t('mq.co.083')}</p></div>
<p class="ap-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg><span>{plan === 'pro' ? t('mq.co.084.pro') : t('mq.co.084')}</span></p>
</div></section>

<dialog id="dlgr" aria-labelledby="dlgrt" aria-describedby="dlgrd"><h2 id="dlgrt">{t('mq.co.085')}</h2><p id="dlgrd"><b id="dlgrw">{t('mq.co.086')}</b> {t('mq.co.087')} <span class="ap-site" id="dlgrs">{t('mq.co.086')}</span>{t('mq.co.088')}</p>
<div class="row"><button type="button" class="btn btn-ghost" id="rc"><span class="bl">{t('mq.co.089')}</span></button><button type="button" class="btn btn-danger" id="rok"><span class="bl">{t('mq.co.081')}</span></button></div></dialog>

<section class="blk" id="conditions" aria-labelledby="hc"><div class="bento">
<div class="card box c7 rv"><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/></svg></div><p class="sub">{t('mq.co.090')}</p><h2 class="sec" id="hc" style="font-size:24px;margin:0 0 6px">{t('mq.co.091')}</h2>
<div class="meta"><span class="mc">{t('mq.co.092')} <b>{t('mq.co.093')}</b></span><span class="mc">{t('mq.co.094')} <b id="acd">{t('mq.co.095')}</b></span></div>
<label class="sw"><input type="checkbox" id="consent" checked><span class="tg" aria-hidden="true"></span><span class="t">{t('mq.co.096')}</span></label>
<div class="row"><a class="lnk lk-pill" href="/cgu">{t('mq.co.097')}</a><button type="button" class="btn btn-primary" id="acc"><span class="bl">{t('mq.co.098')}</span><span class="spin" aria-hidden="true"></span></button><span class="done" id="accd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('mq.co.099')}</span></div>
<label class="sw"><input type="checkbox" id="notify-audit-end" checked><span class="tg" aria-hidden="true"></span><span class="t">{t('account.notify.label')}</span></label>
<p class="fine" id="notify-audit-end-hint">{t('account.notify.hint')}</p>
<p class="fine" id="notify-audit-end-status" role="status"></p>
</div>
<div class="card box c5 rv" id="export"><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></div><p class="sub">{t('mq.co.100')}</p><h2 class="sec" style="font-size:24px;margin:0 0 6px">{t('mq.co.101')}</h2>
<p>{t('mq.co.102')}</p>
<div class="jf"><span class="br" aria-hidden="true">{t('mq.co.103')}</span><div><b>{t('mq.co.104')}</b><small>{t('mq.co.105')}</small></div></div>
<button type="button" class="btn btn-primary" id="exp"><span class="bl">{t('mq.co.106')}</span><span class="spin" aria-hidden="true"></span></button><div class="pbar" id="pb" aria-hidden="true"><i></i></div></div>
</div></section>

<section class="blk" id="abonnement" aria-labelledby="hp"><div class="pz rv" id="pz"><div class="pin">
<div class="pau" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="ptop"><div><span class="pbadge">{t('mq.co.107')}</span><span class="psoon">{t('mq.co.108')}</span>
<h2 id="hp">{t('mq.co.109')} <em>{t('mq.co.110')}</em>{t('mq.co.111')}</h2>
<p class="pl">{t('mq.co.112')}</p></div>
<div class="pcta"><button type="button" class="pbtn" id="pro" aria-pressed="false"><svg class="bel" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="bl">{t('mq.co.113')}</span></button>
<small>{t('mq.co.114')}</small></div></div>
<div class="pgrid">
<article class="pf"><div class="ill" aria-hidden="true"><span class="tl1"></span><div class="hc h0"><span class="gk" style="background:#FBE8C8;color:#8A4B08">{t('mq.co.115')}</span><span class="ln"></span><span>{t('mq.co.116')}</span></div><div class="hc h1"><span class="gk" style="background:#DDE4F8;color:#2B3B85">{t('mq.co.117')}</span><span class="ln"></span><span>{t('mq.co.118')}</span></div><div class="hc h2"><span class="gk" style="background:#D6F2E3;color:#065F3A">{t('mq.co.012')}</span><span class="ln"></span><span>{t('mq.co.119')}</span></div></div><h3>{t('mq.co.120')} <b>{t('mq.co.121')}</b></h3><p>{t('mq.co.122')}</p></article>
<article class="pf"><div class="ill" aria-hidden="true"><div class="ch"><svg viewBox="0 0 300 120" preserveAspectRatio="none"><defs><linearGradient id="par" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2FA36B" stop-opacity=".35"/><stop offset="1" stop-color="#2FA36B" stop-opacity="0"/></linearGradient></defs>
<path class="gl" d="M0 30H300M0 60H300M0 90H300"/><path class="ar" d="M0 96 L60 84 L120 70 L180 52 L240 34 L300 18 V120 H0Z"/>
<path class="tr" pathLength="1" stroke="#2FA36B" d="M0 96 L60 84 L120 70 L180 52 L240 34 L300 18"/>
<path class="tr" pathLength="1" stroke="#7091E6" d="M0 70 L60 74 L120 58 L180 62 L240 46 L300 40"/>
<path class="tr" pathLength="1" stroke="#E0A63A" d="M0 104 L60 98 L120 100 L180 86 L240 80 L300 70"/></svg></div>
<div class="lg2"><span><i style="background:#2FA36B"></i>{t('mq.co.123')}</span><span><i style="background:#7091E6"></i>{t('mq.co.124')}</span><span><i style="background:#E0A63A"></i>{t('mq.co.125')}</span></div></div><h3>{t('mq.co.126')} <b>{t('mq.co.127')}</b></h3><p>{t('mq.co.128')}</p></article>
<article class="pf"><div class="ill" aria-hidden="true"><div class="env"><b>{t('mq.co.129')}</b></div>
<div class="tst t1"><i style="background:#2FA36B"></i><span>{t('mq.co.130')}</span></div><div class="tst t2"><i style="background:#E1763F"></i><span>{t('mq.co.131')}</span></div><div class="tst t3"><i style="background:#7091E6"></i><span>{t('mq.co.132')}</span></div></div><h3>{t('mq.co.133')} <b>{t('mq.co.134')}</b></h3><p>{t('mq.co.135')}</p></article>
<article class="pf"><div class="ill" aria-hidden="true"><div class="mt"><span class="mpro">{t('mq.co.107')}</span><div class="tk"><span class="fl"></span></div><span class="cap"><span>{t('mq.co.136')}</span></span><div class="sc"><span>{t('mq.co.137')}</span><span>{t('mq.co.138')}</span></div></div></div><h3>{t('mq.co.139')} <b>{t('mq.co.140')}</b></h3><p>{t('mq.co.141')}</p></article>
</div>
<p class="ptr"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('mq.co.142')}</span></p>
</div></div></section>

<section class="blk" id="contact" aria-labelledby="hct"><p class="kicker">{t('mq.co.143')}</p>
<h2 class="sec" id="hct">{t('mq.co.144')}</h2>
<p class="sec-lede">{t('mq.co.145')}</p>
<div class="cgrid">
<div class="card box rv"><span class="rt"><i class="pulse" aria-hidden="true"></i>{t('mq.co.146')}</span><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M22 7l-10 6L2 7"/></svg></div><h3>{t('mq.co.147')}</h3><p>{t('mq.co.148')}</p>
<div class="mcard"><small>{t('mq.co.149')}</small><a href="mailto:Audixio@outlook.fr">{t('mq.co.150')}</a><button type="button" class="btn btn-ghost btn-sm cp" data-copy="Audixio@outlook.fr" data-msg={t('mq.co.151')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span class="bl">{t('mq.co.152')}</span><span class="spin" aria-hidden="true"></span></button></div></div>
<div class="card box rv"><form class="f" id="cf" novalidate>
<div class="fld"><label for="mot">{t('mq.co.153')}</label><select id="mot"><option>{t('mq.co.154')}</option><option>{t('mq.co.155')}</option><option>{t('mq.co.156')}</option><option>{t('mq.co.157')}</option></select></div>
<div class="fld"><label for="msg">{t('mq.co.158')}</label><textarea id="msg" maxlength="1000" placeholder={t('mq.co.159')} aria-describedby="msgh"></textarea><div class="hint" id="msgh"><span id="msge">{t('mq.co.160')}</span><span><span id="cnt">{t('mq.co.161')}</span> {t('mq.co.162')}</span></div></div>
<div class="row"><button class="btn btn-primary" type="submit" id="snd"><span class="bl">{t('mq.co.163')}</span><span class="spin" aria-hidden="true"></span></button></div></form>
<div class="sent" id="sent" tabindex="-1"><div class="bub"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></div><h3>{t('mq.co.164')}</h3><p>{t('mq.co.165')}</p><p style="margin-top:var(--x-s3)"><button type="button" class="btn btn-ghost btn-sm" id="again"><span class="bl">{t('mq.co.166')}</span></button></p></div>
</div></div></section>

<section class="blk" aria-label={t('mq.co.167')}><a class="qa rv" href="/sites"><div><p class="kicker">{t('mq.co.168')}</p><h2>{t('mq.co.169')}</h2><p>{t('mq.co.170')}</p></div><span class="go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a></section>
<section class="blk" aria-label={t('mq.co.171')}><a class="qa rv" href="#alertes"><div><p class="kicker">{t('mq.co.172')}</p><h2>{t('mq.co.173')}</h2><p>{t('mq.co.174')}</p></div><span class="go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a></section>

<section class="blk" id="danger" aria-labelledby="hd"><div class="card box dz rv"><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg></div><p class="sub">{t('mq.co.175')}</p><h2 class="sec" id="hd" style="margin-top:0">{t('mq.co.011')}</h2>
<p>{t('mq.co.176')}</p>
<div class="row"><button type="button" class="btn btn-danger" id="del"><span class="bl">{t('mq.co.177')}</span></button></div></div></section>

<dialog id="dlg" aria-labelledby="dlgt" aria-describedby="dlgd"><h2 id="dlgt">{t('mq.co.178')}</h2><p id="dlgd">{t('mq.co.179')} <b>{t('mq.co.180')}</b> {t('mq.co.181')}</p>
<label class="sr-only" for="cfm">{t('mq.co.182')}</label><input id="cfm" autocomplete="off" spellcheck="false">
<div class="row"><button type="button" class="btn btn-ghost" id="dc"><span class="bl">{t('mq.co.089')}</span></button><button type="button" class="btn btn-danger" id="dok" disabled><span class="bl">{t('mq.co.183')}</span></button></div></dialog>

</main>
<div class="toast" id="toast" aria-hidden="true"></div><p class="sr-only" id="live" role="status" aria-live="polite"></p>
{/if}
</div>
