<script lang="ts">
import { onMount, tick } from 'svelte';
import { t } from '../i18n/index.js';
import type { CategoryItem } from '../lib/categories.js';
import { domainPager, domainShort, REPORT_DOMAINS } from '../lib/domains.js';
import { domainLetter, verifyHref } from '../lib/hub-view.js';
import { revealAll } from '../lib/motion.js';

interface Props {
  auditId: string;
  siteId: string;
  domainId: string;
  host: string;
  items?: CategoryItem[];
}

let { auditId, siteId, domainId, host, items = [] }: Props = $props();
let root: HTMLElement | undefined = $state();
let tab = $state<'gsc' | 'dns' | 'meta' | 'file' | 'wk'>('gsc');
const name = $derived(domainShort(domainId));
const hubHref = $derived(`/rapport?id=${encodeURIComponent(auditId)}`);
const guideHref = $derived(`${verifyHref(siteId)}#methodes`);
const order = REPORT_DOMAINS as readonly string[];
const index = $derived(Math.max(0, order.indexOf(domainId)));
const prevId = $derived(
  order[(index - 1 + order.length) % order.length] ?? domainId,
);
const nextId = $derived(order[(index + 1) % order.length] ?? domainId);
const prev = $derived(items.find((item) => item.id === prevId));
const next = $derived(items.find((item) => item.id === nextId));
const slot = $derived(t('restreint.token.slot'));
const checks = [
  {
    title: 'restreint.check.1' as const,
    body: 'restreint.check.1b' as const,
    icon: 'cert' as const,
  },
  {
    title: 'restreint.check.2' as const,
    body: 'restreint.check.2b' as const,
    icon: 'file' as const,
  },
  {
    title: 'restreint.check.3' as const,
    body: 'restreint.check.3b' as const,
    icon: 'globe' as const,
  },
];
const tabs = [
  { id: 'gsc' as const, label: 'restreint.tab.gsc' as const },
  { id: 'dns' as const, label: 'restreint.tab.dns' as const },
  { id: 'meta' as const, label: 'restreint.tab.meta' as const },
  { id: 'file' as const, label: 'restreint.tab.file' as const },
  { id: 'wk' as const, label: 'restreint.tab.wk' as const },
];

function hrefOf(item: CategoryItem | undefined, id: string): string {
  return (
    item?.href ??
    `/domaine?id=${encodeURIComponent(auditId)}&domaine=${encodeURIComponent(id)}`
  );
}

function letterOf(item: CategoryItem | undefined): string | null {
  if (!item) return null;
  return domainLetter(item.score, Boolean(item.locked));
}

function proofText(): string {
  if (tab === 'gsc') return host;
  if (tab === 'dns') return `audixio-verification=${slot}`;
  if (tab === 'meta')
    return `<meta name="audixio-verification" content="${slot}">`;
  if (tab === 'file') return `${host}/audixio-${slot}.html`;
  return `${host}/.well-known/audixio-verification.txt`;
}

function onCopy(): void {
  void navigator.clipboard.writeText(proofText());
}

onMount(() => {
  document.documentElement.dataset.vue = 'restreint';
  let stop = (): void => {};
  void tick().then(() => {
    if (root) stop = revealAll(root);
  });
  return () => stop();
});
</script>

{#snippet lockIco()}
  <svg class="ico lk" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
{/snippet}
{#snippet okIco()}
  <svg class="ico ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
{/snippet}

<div style="display:contents" bind:this={root}>
  <div class="crumbs-bar">
    <div class="wrap crumbs">
      <nav aria-label={t('hub.crumbs')}>
        <ol>
          <li><a href={hubHref}><span class="txt">{t('report.heading')} {host}</span></a></li>
          <li><span aria-current="page">{name}</span></li>
        </ol>
      </nav>
      <a class="back" href={hubHref} aria-label={t('restreint.back')}><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg><span class="t">{t('restreint.back')}</span></a>
    </div>
  </div>

  <section class="hero" id="hero" aria-labelledby="h1">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="wrap">
      <div class="notice rv">
        <div>
          <strong>{t('restreint.notice')}</strong>
          <span class="tag"><span>{t('restreint.limited')}</span></span>
          <p>{t('restreint.lead')}</p>
        </div>
      </div>
      <div class="hero-grid">
        <div>
          <p class="status-pill rv"><i aria-hidden="true"></i><span>{t('restreint.unverified', { host })}</span></p>
          <div class="title-row">
            <span class="dom-tile" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/></svg></span>
            <h1 id="h1">{name}</h1>
            <span class="tag lock-tag"><span>{t('domain.locked.badge')}</span></span>
          </div>
          <p class="subtitle rv">{t('domain.locked.teaser')}</p>
          <p class="hero-p rv">{t('restreint.sub')}</p>
          <div class="hero-cta rv">
            <a class="btn btn-primary" href="#debloquer"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>{t('restreint.cta')}<svg class="ico down" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></a>
            <p hidden><a href="/demande-acces">{t('mq.demande.032')}</a> <a href="/passer-pro">{t('mq.passer.015')}</a></p>
          </div>
        </div>
        <div class="scene-wrap rv from-right">
          <div class="scene" data-state="locked" role="img" aria-label={t('restreint.scene')}>
            <div class="halo"></div>
            <div class="tilt">
              <div class="floaty">
                <div class="ring r1"><span class="bead"></span></div>
                <div class="ring r2"><span class="bead"></span></div>
                <div class="shield3d" id="shield3d">
                  <div class="face" aria-hidden="true"><img src="/marque/bouclier-restreint.svg" alt="" width="200" height="240" /></div>
                  <div class="lockwrap">
                    <svg viewBox="0 0 120 120" aria-hidden="true">
                      <g class="shackle"><path d="M38 54 V38 a22 22 0 0 1 44 0 V54" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/></g>
                      <rect class="body-lock" x="24" y="52" width="72" height="54" rx="14" fill="#fff"/>
                      <circle cx="60" cy="74" r="8" fill="#3D52A0"/><rect x="56.5" y="76" width="7" height="14" rx="3.5" fill="#3D52A0"/>
                    </svg>
                  </div>
                </div>
                <div class="chip3d c1">{@render lockIco()}{@render okIco()}{t('restreint.chip.1')}</div>
                <div class="chip3d c2">{@render lockIco()}{@render okIco()}{t('restreint.chip.2')}</div>
                <div class="chip3d c3">{@render lockIco()}{@render okIco()}{t('restreint.chip.3')}</div>
              </div>
            </div>
            <div class="scene-badges"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>{t('restreint.tested')}<em>{t('restreint.reserved')}</em></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="why-title">
    <div class="wrap why">
      <div>
        <div class="sec-title rv"><span class="t-ico" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></span><h2 class="h2" id="why-title">{t('restreint.why')}</h2></div>
        <div class="copy">
          <p class="rv">{t('restreint.why.1')}</p>
          <p class="rv">{t('restreint.why.2')}</p>
        </div>
      </div>
      <div class="doc rv from-right" aria-hidden="true">
        <div class="doc-bar"><strong>{t('restreint.doc')}</strong><small>{host}</small></div>
        <div class="doc-body">
          <div class="d-line"><span class="dot"><svg class="ico" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span><div class="bars"><span class="redact" style="--k:0;width:64%"><i></i></span><span class="redact" style="--k:1;width:92%"><i></i></span></div></div>
          <div class="d-line"><span class="dot"><svg class="ico" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></span><div class="bars"><span class="redact" style="--k:2;width:48%"><i></i></span><span class="redact" style="--k:3;width:84%"><i></i></span><span class="redact" style="--k:4;width:70%"><i></i></span></div></div>
          <div class="d-line"><span class="dot"><svg class="ico" viewBox="0 0 24 24"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg></span><div class="bars"><span class="redact" style="--k:5;width:78%"><i></i></span><span class="redact" style="--k:6;width:56%"><i></i></span></div></div>
          <div class="d-line"><span class="dot"><svg class="ico" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span><div class="bars"><span class="redact" style="--k:7;width:88%"><i></i></span><span class="redact" style="--k:8;width:60%"><i></i></span></div></div>
        </div>
        <div class="stamp">{@render lockIco()}{t('restreint.stamp')}</div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="checks-title">
    <div class="wrap">
      <div class="checks-head">
        <div class="sec-title rv"><span class="t-ico" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><path d="M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></span><h2 class="h2" id="checks-title">{t('restreint.checks')}</h2></div>
        <p class="count-pill rv"><b>{checks.length}</b> {t('restreint.count')}</p>
      </div>
      <div class="checks">
        {#each checks as item (item.title)}
          <article class="check rv">
            <span class="c-ico" aria-hidden="true">
              {#if item.icon === 'cert'}
                <svg class="ico" viewBox="0 0 24 24"><path d="M12 2l2.4 2.1 3.2-.2.9 3.1 2.7 1.8-1 3.1 1 3.1-2.7 1.8-.9 3.1-3.2-.2L12 22l-2.4-2.1-3.2.2-.9-3.1-2.7-1.8 1-3.1-1-3.1 2.7-1.8.9-3.1 3.2.2L12 2z"/><path d="m9 12 2 2 4-4"/></svg>
              {:else if item.icon === 'file'}
                <svg class="ico" viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14l2 2 4-4"/></svg>
              {:else}
                <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
              {/if}
            </span>
            <h3>{t(item.title)}</h3>
            <p>{t(item.body)}</p>
            <span class="pend">{@render lockIco()}{@render okIco()}<span class="t-wait">{t('restreint.wait')}</span><span class="t-ok">{t('restreint.ready')}</span></span>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="section" id="debloquer" aria-labelledby="unlock-title">
    <div class="wrap">
      <div class="sec-title rv"><span class="t-ico" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg></span><h2 class="h2" id="unlock-title">{t('restreint.unlock')}</h2></div>
      <div class="unlock-card rv">
        <div class="uc-head">
          <h3>{t('restreint.prove', { host })}</h3>
          <p>{t('restreint.prove.lead')}</p>
        </div>
        <div class="uc-grid">
          <ol class="steps">
            <li class="step on">
              <span class="step-n" aria-hidden="true"><span>1</span><svg class="ico" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>
              <div><h4>{t('restreint.step.1')}</h4><p>{t('restreint.step.1b')}</p></div>
            </li>
            <li class="step">
              <span class="step-n" aria-hidden="true"><span>2</span><svg class="ico" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>
              <div><h4>{t('restreint.step.2')}</h4><p>{t('restreint.step.2b')}</p></div>
            </li>
            <li class="step">
              <span class="step-n" aria-hidden="true"><span>3</span><svg class="ico" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>
              <div><h4>{t('restreint.step.3')}</h4><p>{t('restreint.step.3b')}</p></div>
            </li>
          </ol>
          <div class="console">
            <div class="con-head">
              <span class="con-title"><span class="keyico" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2m-3 3 3 3m-5-1 2 2"/></svg></span>{t('restreint.console')}</span>
              <span class="con-tags"><span>{t('restreint.free')}</span><span>{t('restreint.unique')}</span></span>
            </div>
            <div class="con-body">
              <div class="seg" role="tablist" aria-label={t('verify.method')}>
                {#each tabs as item (item.id)}
                  <button type="button" role="tab" aria-selected={tab === item.id} onclick={() => { tab = item.id; }}>{t(item.label)}{#if item.id === 'gsc'} <span class="rec">{t('restreint.rec')}</span>{/if}</button>
                {/each}
              </div>
              <div class="code-wrap">
                {#if tab === 'gsc'}
                  <p class="how"><strong>{t('restreint.how.label')}</strong> {t('restreint.how.gsc')}</p>
                  <div class="code-meta"><span>{t('restreint.access')}</span><b>{t('restreint.access.v')}</b><span>{t('restreint.role')}</span><b>{t('restreint.role.v')}</b></div>
                  <a class="btn gbtn" href={verifyHref(siteId)}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#fbbc05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>{t('restreint.google')}</a>
                  <pre class="code" tabindex="0"><span class="k">{t('restreint.role')}</span>=<span class="s">{host}</span></pre>
                {:else if tab === 'dns'}
                  <p class="how"><strong>{t('restreint.where.label')}</strong> {t('restreint.how.dns')}</p>
                  <div class="code-meta"><span>{t('restreint.dns.type')}</span><b>{t('restreint.dns.txt')}</b><span>{t('restreint.dns.host')}</span><b>{t('restreint.dns.at')}</b></div>
                  <pre class="code" tabindex="0"><span class="k">audixio-verification</span>=<span class="s">{slot}</span></pre>
                {:else if tab === 'meta'}
                  <p class="how"><strong>{t('restreint.where.label')}</strong> {t('restreint.how.meta')}</p>
                  <div class="code-meta"><span>{t('restreint.meta.where')}</span><b>{t('restreint.meta.head')}</b></div>
                  <pre class="code" tabindex="0">&lt;<span class="t">meta</span> <span class="k">name</span>=<span class="s">"audixio-verification"</span> <span class="k">content</span>=<span class="s">"{slot}"</span>&gt;</pre>
                {:else if tab === 'file'}
                  <p class="how"><strong>{t('restreint.where.label')}</strong> {t('restreint.how.file')}</p>
                  <div class="code-meta"><span>{t('restreint.file.addr')}</span><b>{host}/audixio-{slot}.html</b></div>
                  <pre class="code" tabindex="0"><span class="s">{slot}</span></pre>
                {:else}
                  <p class="how"><strong>{t('restreint.where.label')}</strong> {t('restreint.how.wk')}</p>
                  <div class="code-meta"><span>{t('restreint.file.addr')}</span><b>{host}/.well-known/audixio-verification.txt</b></div>
                  <pre class="code" tabindex="0"><span class="s">{slot}</span></pre>
                {/if}
                <button class="copy" type="button" onclick={onCopy}><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>{t('restreint.copy')}</button>
              </div>
              <div class="con-actions">
                <a class="btn btn-primary" href={verifyHref(siteId)}><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>{t('restreint.verify.site')}</a>
                <a class="guide" href={guideHref}>{t('restreint.guide')}<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
              </div>
            </div>
          </div>
        </div>
        <div class="uc-notes">
          <div class="uc-note"><h4>{@render lockIco()}{t('restreint.note.1')}</h4><p>{t('restreint.note.1b')}</p></div>
          <div class="uc-note"><h4><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2m-3 3 3 3m-5-1 2 2"/></svg>{t('restreint.note.2')}</h4><p>{t('restreint.note.2b')}</p></div>
          <div class="uc-note"><h4><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>{t('restreint.note.3')}</h4><p>{t('restreint.note.3b')}</p></div>
        </div>
      </div>
    </div>
  </section>

  <section aria-label={t('domain.nav')}>
    <div class="wrap">
      <nav class="pager" aria-label={t('domain.nav')}>
        <a class="pg prev rv" href={hrefOf(prev, prevId)}>
          <span class="arr" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></span>
          <span class="txt"><small>{t('domaine.prev')}</small><strong>{domainPager(prevId)}</strong></span>
          {#if letterOf(prev)}<span class="grade g-{letterOf(prev)?.toLowerCase()}"><span class="sr-only">{t('domaine.grade.note', { grade: letterOf(prev) ?? '' })}</span>{letterOf(prev)}</span>{/if}
        </a>
        <a class="pg next rv" href={hrefOf(next, nextId)}>
          <span class="arr" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
          <span class="txt"><small>{t('domaine.next')}</small><strong>{domainPager(nextId)}</strong></span>
          {#if letterOf(next)}<span class="grade g-{letterOf(next)?.toLowerCase()}"><span class="sr-only">{t('domaine.grade.note', { grade: letterOf(next) ?? '' })}</span>{letterOf(next)}</span>{/if}
        </a>
      </nav>
      <div class="back-all rv">
        <a class="btn btn-ghost" href={hubHref}>{t('restreint.back.all')}<svg class="ico down" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></a>
      </div>
    </div>
  </section>
</div>
