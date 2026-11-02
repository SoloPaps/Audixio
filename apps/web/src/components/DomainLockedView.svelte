<script lang="ts">
import { onMount, tick } from 'svelte';
import { t } from '../i18n/index.js';
import { domainShort } from '../lib/domains.js';
import { verifyHref } from '../lib/hub-view.js';
import { revealAll } from '../lib/motion.js';

interface Props {
  auditId: string;
  siteId: string;
  domainId: string;
  host: string;
}

let { auditId, siteId, domainId, host }: Props = $props();
let root: HTMLElement | undefined = $state();
const name = $derived(domainShort(domainId));
const hubHref = $derived(`/rapport?id=${encodeURIComponent(auditId)}`);
const checks = [
  { title: 'restreint.check.1' as const, body: 'restreint.check.1b' as const },
  { title: 'restreint.check.2' as const, body: 'restreint.check.2b' as const },
  { title: 'restreint.check.3' as const, body: 'restreint.check.3b' as const },
];

onMount(() => {
  document.documentElement.dataset.vue = 'restreint';
  let stop = (): void => {};
  void tick().then(() => {
    if (root) stop = revealAll(root);
  });
  return () => stop();
});
</script>

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
                </div>
                <div class="chip3d c1"><svg class="ico lk" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><svg class="ico ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('restreint.point')}</div>
                <div class="chip3d c2"><svg class="ico lk" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><svg class="ico ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('restreint.point')}</div>
                <div class="chip3d c3"><svg class="ico lk" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><svg class="ico ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>{t('restreint.point')}</div>
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
        <div class="stamp">{t('restreint.stamp')}</div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="checks-title">
    <div class="wrap">
      <div class="checks-head">
        <div class="sec-title rv"><h2 class="h2" id="checks-title">{t('restreint.checks')}</h2></div>
        <p class="count-pill rv"><b>{checks.length}</b> {t('restreint.count')}</p>
      </div>
      <div class="checks">
        {#each checks as item (item.title)}
          <article class="check rv">
            <h3>{t(item.title)}</h3>
            <p>{t(item.body)}</p>
            <span class="pend"><span class="t-wait">{t('restreint.wait')}</span></span>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="section" id="debloquer" aria-labelledby="unlock-title">
    <div class="wrap">
      <div class="sec-title rv"><h2 class="h2" id="unlock-title">{t('restreint.unlock')}</h2></div>
      <div class="unlock-card rv">
        <div class="uc-head">
          <h3>{t('restreint.prove', { host })}</h3>
          <p>{t('restreint.prove.lead')}</p>
        </div>
        <a class="btn btn-primary" href={verifyHref(siteId)}>{t('domain.locked.cta')}</a>
      </div>
    </div>
  </section>
</div>
