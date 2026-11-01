<script lang="ts">
import { onMount, tick } from 'svelte';
import { formatDate } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import type { AuditPayload } from '../lib/audit-api.js';
import { domainShort, domainSymbol } from '../lib/domains.js';
import {
  badgeHref,
  domainLetter,
  planHref,
  priorityHref,
  type SeverityTone,
  severityTone,
  shareGesture,
} from '../lib/hub-view.js';
import { linkPins, revealAll } from '../lib/motion.js';
import type { CategoryItem, ReportRow } from '../lib/report-model.js';
import { relaunchHref } from '../lib/relaunch.js';
import { rose } from '../lib/rose.js';
import ShareSheet from './ShareSheet.svelte';

interface Priority {
  id: string;
  title: string;
}

interface Props {
  payload: AuditPayload;
  items: CategoryItem[];
  rows: ReportRow[];
  priorities: Priority[];
  host: string;
  letter: string | null;
  verified: boolean;
  partialText: string;
  headline: string;
  stamp: Date;
}

let {
  payload,
  items,
  rows,
  priorities,
  host,
  letter,
  verified,
  partialText,
  headline,
  stamp,
}: Props = $props();

let shareOpen = $state(false);
let root: HTMLElement | undefined = $state();
let roseHost: HTMLDivElement | undefined = $state();

const auditId = $derived(payload.audit.id);
const global = $derived(payload.audit.globalScore);
const scored = $derived(items.filter((item) => item.score !== null).length);
const PIN_SPOTS = [
  { left: '50%', top: '36%', d: '0s' },
  { left: 'calc(100% - 16px)', top: '50%', d: '.4s', bar: true, al: true },
  { left: '16px', top: '50%', d: '.8s', bar: true },
  { left: '24%', top: '68%', d: '1.2s' },
  { left: '80%', top: '84%', d: '1.6s', al: true },
];

const prioRows = $derived(
  priorities.map((item, index) => {
    const row = rows.find((entry) => entry.id === item.id);
    const tone = severityTone(row?.severity ?? 1, row?.catalogStatus ?? 'warn');
    return {
      id: item.id,
      rank: index + 1,
      title: item.title,
      tone,
      domain: row?.domain ?? '',
      href: priorityHref(auditId, row?.domain ?? '', item.id),
    };
  }),
);
const pins = $derived(prioRows.slice(0, PIN_SPOTS.length));
const topPins = $derived(pins.filter((_pin, index) => PIN_SPOTS[index]?.bar));
const shotPins = $derived(pins.filter((_pin, index) => !PIN_SPOTS[index]?.bar));

function toneClass(tone: SeverityTone): string {
  return tone === 'check' ? 'chk' : tone;
}
function toneIcon(tone: SeverityTone): string {
  if (tone === 'crit') return 'i-st-crit';
  if (tone === 'fix') return 'i-st-fix';
  if (tone === 'check') return 'i-st-check';
  return 'i-st-minor';
}
function toneLabel(tone: SeverityTone): string {
  if (tone === 'crit') return t('hub.sev.crit');
  if (tone === 'fix') return t('hub.sev.fix');
  if (tone === 'check') return t('hub.sev.check');
  return t('hub.sev.minor');
}
function gradeOf(item: CategoryItem): string | null {
  return domainLetter(item.score, item.locked);
}

async function onShare(event: MouseEvent): Promise<void> {
  event.preventDefault();
  const coarse =
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 820px)').matches;
  if (shareGesture(coarse, typeof navigator.share === 'function')) {
    try {
      await navigator.share({
        title: document.title,
        url: `${location.origin}/rapport?id=${encodeURIComponent(auditId)}`,
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  shareOpen = true;
}

onMount(() => {
  let stopRose: (() => void) | undefined;
  let stopReveal: (() => void) | undefined;
  let stopPins: (() => void) | undefined;
  void tick().then(() => {
    if (!root) return;
    if (roseHost) {
      const cards = [...root.querySelectorAll<HTMLElement>('.dom')].map((el, index) => {
        const item = items[index];
        return {
          el,
          icon: el.dataset.icon ?? 'i-perf',
          short: el.dataset.short ?? '',
          score: item && !item.locked ? item.score : null,
          grade: item ? gradeOf(item) : null,
        };
      });
      const summary = cards
        .map((card) =>
          card.score === null
            ? t('hub.rose.untested', { name: card.short })
            : `${card.short} ${card.grade ?? ''} ${card.score}`,
        )
        .join(', ');
      stopRose = rose(roseHost, {
        cards,
        score: global,
        grade: letter,
        text: {
          title: letter
            ? t('hub.rose.title', { grade: letter, score: global ?? 0 })
            : t('hub.note.missing'),
          desc: t('hub.rose.desc', { summary }),
          label: t('hub.note'),
          untested: t('hub.untested'),
        },
      }).destroy;
    }
    stopReveal = revealAll(root);
    stopPins = linkPins(root);
    const hash = decodeURIComponent(location.hash.replace(/^#/u, ''));
    if (hash) document.getElementById(hash)?.scrollIntoView();
  });
  return () => {
    stopRose?.();
    stopReveal?.();
    stopPins?.();
  };
});
</script>

<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <symbol id="i-perf" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></symbol>
    <symbol id="i-seo" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></symbol>
    <symbol id="i-sec" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></symbol>
    <symbol id="i-eco" viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 4 13c0-6 6-9 16-9 0 10-3 16-9 16z"/><path d="M4 21c3-6 6-9 11-11"/></symbol>
    <symbol id="i-a11y" viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2"/><path d="M5 8l7 1.5L19 8M12 9.5V14l-3 6M12 14l3 6"/></symbol>
    <symbol id="i-code" viewBox="0 0 24 24"><path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/></symbol>
    <symbol id="i-priv" viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 6.1A9.5 9.5 0 0 1 12 6c5 0 9 4 10 6a12 12 0 0 1-2.6 3.4M6.5 7.5A12.5 12.5 0 0 0 2 12c1 2 5 6 10 6 1.3 0 2.5-.3 3.6-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></symbol>
    <symbol id="i-dns" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></symbol>
    <symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
    <symbol id="i-st-crit" viewBox="0 0 24 24"><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"/><path d="M12 7v6M12 16.5v.5"/></symbol>
    <symbol id="i-st-fix" viewBox="0 0 24 24"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></symbol>
    <symbol id="i-st-check" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v3.5M11 14v.3"/></symbol>
    <symbol id="i-st-ok" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.8"/></symbol>
    <symbol id="i-st-minor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></symbol>
    <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m8.8 12.2 2.3 2.3 4.2-4.4"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol>
  </defs>
</svg>

{#snippet pin(item: (typeof prioRows)[number], index: number)}
  {@const spot = PIN_SPOTS[index]}
  <a class="pin" class:p1={item.rank === 1} class:p2={item.rank === 2} class:p3={item.rank === 3} href={`#prio-${item.rank}`} data-pin={item.rank} aria-label={t('hub.pin.label', { n: item.rank, title: item.title })} data-pos={spot?.bar ? 'b' : undefined} data-al={spot?.al ? 'r' : undefined} style={`left:${spot?.left};top:${spot?.top};--k:${index};--d:${spot?.d}`}><span aria-hidden="true">{item.rank}</span><span class="tip" aria-hidden="true"><small class:t1={item.tone === 'crit'} class:t2={item.tone === 'fix'} class:t3={item.tone === 'check'}><svg aria-hidden="true"><use href={`#${toneIcon(item.tone)}`}/></svg>{toneLabel(item.tone)}</small>{item.title}</span></a>
{/snippet}

<div style="display:contents" bind:this={root}>
  <div class="page-h rv">
    <div>
      <nav class="crumbs" aria-label={t('hub.crumbs')}><ol><li><a href="/sites">{t('nav.sites.long')}</a></li><li aria-current="page">{host}</li></ol></nav>
      <div class="ttl">
        <h1>{t('hub.audit.lead')} <span class="u mono">{host}</span></h1>
        {#if verified}
          <span class="verified" title={t('hub.verified.title')}><svg aria-hidden="true"><use href="#i-shield"/></svg>{t('hub.verified')}</span>
        {:else if partialText}
          <span class="verified partial"><svg aria-hidden="true"><use href="#i-lock"/></svg>{partialText}</span>
        {/if}
      </div>
      <p class="date">{t('hub.date')} <time datetime={stamp.toISOString().slice(0, 10)}>{formatDate(stamp)}</time></p>
    </div>
    <div class="acts">
      <a class="btn btn-ghost" id="shareBtn" href={`/rapport?id=${encodeURIComponent(auditId)}#partager`} onclick={onShare}><svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2"/></svg>{t('hub.share')}</a>
      <a class="btn btn-ghost" href={badgeHref(auditId)}><svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>{t('hub.badge')}</a>
      <a class="btn btn-ghost" href={`/rapport/${auditId}/imprimer`}><svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>{t('hub.pdf')}</a>
      <a class="btn btn-ghost" id="rerunBtn" href={relaunchHref(payload.audit.site.id)}><svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>{t('hub.rerun')}</a>
    </div>
  </div>

  <section class="hero rv" id="hero" aria-labelledby="t-note">
    <div class="hero-left">
      <figure class="mockfig">
        <div class="mock">
          <div class="mock-win">
            <div class="bar-top">
              <span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
              <div class="pill"><svg class="ico" width="13" height="13" aria-hidden="true"><use href="#i-lock"/></svg>{host}
                {#each pins as item, index (item.id)}
                  {#if PIN_SPOTS[index]?.bar}{@render pin(item, index)}{/if}
                {/each}
              </div>
              <svg class="ico" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style="color:#4A5585"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>
            </div>
            <div class="stage-shot">
              <div class="shot" aria-hidden="true">
                <div class="s-nav"><span class="s-logo"></span><span class="s-sp"></span><span class="s-pill"></span><span class="s-pill"></span><span class="s-pill"></span></div>
                <div class="s-hero"></div>
                <div class="s-lines"><i></i><i></i><i></i></div>
                <div class="s-cards"><i></i><i></i><i></i></div>
              </div>
              <div class="pins">
                {#each pins as item, index (item.id)}
                  {#if !PIN_SPOTS[index]?.bar}{@render pin(item, index)}{/if}
                {/each}
              </div>
            </div>
          </div>
        </div>
        <figcaption class="mockcap">{t('hub.mock.cap', { n: topPins.length + shotPins.length })}</figcaption>
      </figure>
    </div>

    <div class="hero-right">
      <div class="rose" id="rose" bind:this={roseHost}><div class="rose-fb"><b class="mono">{letter ?? '–'}</b><span class="mono">{global ?? '–'}/100</span></div></div>
      <div class="note-txt">
        <h2 id="t-note">{t('hub.note')}</h2>
        <p class="note-sub">{t('hub.note.sub', { n: scored })}</p>
        <p class="note-p">{letter ? headline : t('hub.note.missing')}</p>
      </div>
    </div>
  </section>

  <section aria-labelledby="t-prio">
    <div class="sec-h rv">
      <h2 id="t-prio">{t('hub.priorities')}</h2>
      <p>{t('hub.prio.sub', { n: prioRows.length })}</p>
    </div>
    <ol class="prio">
      {#each prioRows as item, index (item.id)}
        <li class="pr rv" class:l1={index === 0} class:l2={index === 1} class:l3={index === 2} id={`prio-${item.rank}`} style={`--i:${index}`}><a href={item.href}><span class="rk" class:r1={index === 0} class:r2={index === 1} class:r3={index === 2}>{item.rank}</span><span class="pt">{item.title}</span><span class="sev st st-{toneClass(item.tone)}"><svg aria-hidden="true"><use href={`#${toneIcon(item.tone)}`}/></svg>{toneLabel(item.tone)}</span><span class="dchip">{domainShort(item.domain)}</span><svg class="ico chev" width="20" height="20" aria-hidden="true"><use href="#i-chev"/></svg></a></li>
      {/each}
    </ol>
  </section>

  <section aria-labelledby="t-dom">
    <div class="sec-h rv">
      <h2 id="t-dom">{t('hub.domains')}</h2>
      <p>{t('hub.domains.hint')}</p>
    </div>
    <ul class="doms">
      {#each items as item, index (item.id)}
        {@const grade = gradeOf(item)}
        <li class="rv" style={`--i:${index}`}><a class="dom" id={`domaine-${item.id}`} href={item.href} data-key={item.id} data-g={grade ?? 'N'} data-icon={domainSymbol(item.id)} data-short={domainShort(item.id)}>
          <span class="tile g-{grade ?? 'N'}"><svg class="ico" width="26" height="26" aria-hidden="true"><use href={`#${domainSymbol(item.id)}`}/></svg></span>
          <span class="dom-txt"><span class="dom-name">{domainShort(item.id)}</span><span class="dom-sum">{item.detail}</span></span>
          {#if grade && item.score !== null}
            <span class="dom-score"><span class="bar mt m-{grade}" style={`--w:${Math.max(0, Math.min(100, item.score))}%`} aria-hidden="true"><i></i></span><span class="grade chip m-{grade}" aria-label={t('report.grade.letter', { grade })}>{grade}</span></span>
          {:else}
            <span class="dom-score"><span class="grade g-N"><svg aria-hidden="true"><use href="#i-lock"/></svg>{item.locked ? t('domain.locked.badge') : t('hub.untested')}</span></span>
          {/if}
          <svg class="ico chev" width="20" height="20" aria-hidden="true"><use href="#i-chev"/></svg></a></li>
      {/each}
    </ul>
  </section>

  <section class="ai rv" aria-labelledby="t-ai">
    <div class="ai-l">
      <div class="orb" aria-hidden="true"><i class="spk"></i><i class="spk"></i><i class="spk"></i></div>
      <div>
        <p class="eyebrow">{t('hub.ai.eyebrow')}</p>
        <h2 id="t-ai">{t('hub.brief.title')}</h2>
        <p class="d">{t('hub.brief.lead')}</p>
      </div>
    </div>
    <a class="btn btn-w" href={planHref(auditId)}><svg class="ico" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>{t('hub.brief.cta')}</a>
  </section>
  <p class="eco-line">{t('hub.eco.lead')} <a href="/ecoconception">{t('hub.eco.link')}</a>.</p>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<ShareSheet {auditId} {host} open={shareOpen} onClose={() => { shareOpen = false; }} />
