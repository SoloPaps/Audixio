<script lang="ts">
import { onMount, tick } from 'svelte';
import { type MessageKey, t } from '../i18n/index.js';
import type { BriefChoice } from '../lib/brief-fetch.js';
import { requestBriefExport, saveBriefExport } from '../lib/brief-fetch.js';
import { briefScreen } from '../lib/brief-screen.js';
import { currentSession } from '../lib/browser-session.js';
import type { CategoryItem } from '../lib/categories.js';
import { REPORT_DOMAINS } from '../lib/domains.js';
import { gradeForScore } from '../lib/grade.js';
import { calm, say } from '../lib/motion.js';
import { detailAllowed } from '../lib/plan-board.js';
import type { ReportRow } from '../lib/report-model.js';

interface Props {
  auditId: string;
  host: string;
  url: string;
  stamp: Date;
  verified: boolean;
  items: CategoryItem[];
  rows: ReportRow[];
}

type Mode = 'skip' | 'check' | 'fix';

let { auditId, host, url, verified, items, rows }: Props = $props();

const NAMES: Record<string, MessageKey> = {
  performance: 'brief.name.performance',
  seo: 'brief.name.seo',
  securite: 'brief.name.securite',
  ecologie: 'brief.name.ecologie',
  accessibilite: 'brief.name.accessibilite',
  qualite: 'brief.name.qualite',
  vie_privee: 'brief.name.vie_privee',
  dns_email: 'brief.name.dns_email',
};
const SHORTS: Record<string, MessageKey> = {
  performance: 'brief.short.performance',
  seo: 'brief.short.seo',
  securite: 'brief.short.securite',
  ecologie: 'brief.short.ecologie',
  accessibilite: 'brief.short.accessibilite',
  qualite: 'brief.short.qualite',
  vie_privee: 'brief.short.vie_privee',
  dns_email: 'brief.short.dns_email',
};
const ICONS: Record<string, string> = {
  performance: '<path d="M12 14l4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/>',
  seo: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  securite: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
  ecologie:
    '<path d="M11 20A7 7 0 0 1 4 13c0-6 6-9 16-9 0 10-3 16-9 16z"/><path d="M4 21c3-6 6-9 11-11"/>',
  accessibilite:
    '<circle cx="12" cy="4.5" r="2"/><path d="M5 8l7 1.5L19 8M12 9.5V14l-3 6M12 14l3 6"/>',
  qualite: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  vie_privee:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>',
  dns_email:
    '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
};

let overrides = $state<Record<string, Mode>>({});
let open = $state('performance');
let canvas = $state<HTMLCanvasElement | null>(null);
let hero = $state<HTMLElement | null>(null);
let preview = $state<HTMLElement | null>(null);
let dockOn = $state(false);

const domains = $derived(
  REPORT_DOMAINS.map((id) => {
    const item = items.find((row) => row.id === id);
    const locked = item?.locked === true || !detailAllowed(id, false, verified);
    const issues = locked
      ? []
      : rows.filter(
          (row) =>
            row.domain === id &&
            row.catalogStatus !== 'na' &&
            row.catalogStatus !== 'untested',
        );
    return {
      id,
      name: t(NAMES[id] ?? 'brief.name.performance'),
      short: t(SHORTS[id] ?? 'brief.short.performance'),
      score: locked ? null : (item?.score ?? null),
      grade: locked ? null : gradeForScore(item?.score ?? null),
      locked,
      untested:
        !locked && (item?.score ?? null) === null && issues.length === 0,
      issues,
    };
  }),
);

function baseMode(row: ReportRow): Mode {
  if (row.catalogStatus === 'fail') return 'fix';
  if (row.catalogStatus === 'warn') return 'check';
  return 'skip';
}

function modeOf(row: ReportRow): Mode {
  return overrides[row.checkId] ?? baseMode(row);
}

function sev(row: ReportRow): 'crit' | 'imp' | 'mod' {
  if (row.catalogStatus === 'fail' && row.severity >= 4) return 'crit';
  if (row.catalogStatus === 'fail' || row.severity >= 3) return 'imp';
  return 'mod';
}

const stats = $derived.by(() => {
  const out = { fix: 0, check: 0, skip: 0, total: 0 };
  for (const domain of domains) {
    for (const issue of domain.issues) {
      out.total += 1;
      out[modeOf(issue)] += 1;
    }
  }
  return out;
});

function domainDots(id: string): { fix: number; check: number; skip: number } {
  const domain = domains.find((item) => item.id === id);
  const out = { fix: 0, check: 0, skip: 0 };
  for (const issue of domain?.issues ?? []) out[modeOf(issue)] += 1;
  return out;
}

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

const previewHtml = $derived.by(() => {
  const chosen = domains.flatMap((domain) =>
    domain.issues.flatMap((issue) => {
      const mode = modeOf(issue);
      if (mode === 'skip') return [];
      return [
        {
          checkId: issue.checkId,
          title: issue.title,
          proof: issue.proof || issue.why,
          mode: mode === 'fix' ? ('fix' as const) : ('verif' as const),
        },
      ];
    }),
  );
  return briefScreen({ url, items: chosen })
    .split('\n')
    .map((line) => `<div class="l">${esc(line)}</div>`)
    .join('');
});

const tokenCount = $derived(Math.max(1, Math.round(previewHtml.length / 3.8)));

function selection(): BriefChoice[] {
  const chosen: BriefChoice[] = [];
  for (const domain of domains) {
    for (const issue of domain.issues) {
      const mode = modeOf(issue);
      if (mode === 'skip') continue;
      chosen.push({
        checkId: issue.checkId,
        mode: mode === 'fix' ? 'fix' : 'verif',
      });
    }
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
    say(t('api.error.unauthorized'));
    return null;
  }
  const file = await requestBriefExport(auditId, token, selection());
  if (!file.ok) {
    say(file.message);
    return null;
  }
  return file;
}

async function copyPrompt(): Promise<void> {
  const file = await serverFile();
  if (!file) return;
  try {
    await navigator.clipboard.writeText(file.markdown);
    say(t('brief.copied'));
  } catch {
    say(t('api.error.internal'));
  }
}

async function download(): Promise<void> {
  const file = await serverFile();
  if (!file) return;
  saveBriefExport(file.filename, file.markdown);
  say(t('brief.saved'));
}

function applyPreset(preset: 'rec' | 'crit' | 'all' | 'none'): void {
  const next: Record<string, Mode> = {};
  for (const domain of domains) {
    for (const issue of domain.issues) {
      if (preset === 'rec') next[issue.checkId] = baseMode(issue);
      else if (preset === 'all') next[issue.checkId] = 'fix';
      else if (preset === 'none') next[issue.checkId] = 'skip';
      else next[issue.checkId] = sev(issue) === 'crit' ? 'fix' : 'skip';
    }
  }
  overrides = next;
  const label =
    preset === 'rec'
      ? t('brief.rec')
      : preset === 'crit'
        ? t('brief.crit')
        : preset === 'all'
          ? t('brief.all')
          : t('brief.none');
  say(t('brief.preset.done', { name: label }));
}

function setMode(checkId: string, mode: Mode): void {
  overrides = { ...overrides, [checkId]: mode };
}

function drawOrbit(): void {
  const cv = canvas;
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const rect = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = rect.width;
  if (size < 8) return;
  cv.width = Math.round(size * dpr);
  cv.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tau = Math.PI * 2;
  const c = size / 2;
  const radius = size / 2 - 20;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(c, c);
  const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  bg.addColorStop(0, 'rgba(61,82,160,.10)');
  bg.addColorStop(1, 'rgba(61,82,160,0)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, tau);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = 'rgba(61,82,160,.28)';
  for (const factor of [0.55, 0.87]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * factor, 0, tau);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const listed = domains;
  listed.forEach((domain, index) => {
    const outer = index % 2 === 1;
    const angle = (index / listed.length) * tau + (outer ? 0.35 : 0);
    const fr = outer ? 0.87 : 0.55;
    const x = Math.cos(angle) * radius * fr;
    const y = Math.sin(angle) * radius * fr;
    const dots = domainDots(domain.id);
    const main = domain.untested
      ? '#adbbda'
      : dots.fix
        ? '#B54708'
        : dots.check
          ? '#3D52A0'
          : '#8697C4';
    ctx.strokeStyle = main;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(domain.untested ? [4, 4] : []);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 23, 0, tau);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = main;
    ctx.font = '700 10px "JetBrains Mono",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(domain.short, x, y);
  });
  const prog = stats.total ? (stats.fix + stats.check) / stats.total : 0;
  const r0 = radius * 0.2;
  const cg = ctx.createRadialGradient(-r0 * 0.3, -r0 * 0.4, 2, 0, 0, r0);
  cg.addColorStop(0, '#7091E6');
  cg.addColorStop(1, '#3D52A0');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, r0, 0, tau);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(61,82,160,.14)';
  ctx.beginPath();
  ctx.arc(0, 0, r0 + 11, 0, tau);
  ctx.stroke();
  ctx.strokeStyle = '#7091E6';
  ctx.beginPath();
  ctx.arc(0, 0, r0 + 11, -Math.PI / 2, -Math.PI / 2 + tau * prog);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(r0 * 0.5)}px "JetBrains Mono",monospace`;
  ctx.fillText(`${stats.fix + stats.check}/${stats.total}`, 0, 0);
  ctx.restore();
}

function hitDomain(event: PointerEvent): string | null {
  const cv = canvas;
  if (!cv) return null;
  const rect = cv.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.width / 2;
  const radius = rect.width / 2 - 20;
  const tau = Math.PI * 2;
  for (let index = 0; index < domains.length; index += 1) {
    const outer = index % 2 === 1;
    const angle = (index / domains.length) * tau + (outer ? 0.35 : 0);
    const fr = outer ? 0.87 : 0.55;
    const sx = Math.cos(angle) * radius * fr;
    const sy = Math.sin(angle) * radius * fr;
    if (Math.hypot(x - sx, y - sy) < 30) return domains[index]?.id ?? null;
  }
  return null;
}

onMount(() => {
  void tick().then(drawOrbit);
  const observers: IntersectionObserver[] = [];
  let heroOut = false;
  let prevIn = true;
  let footIn = false;
  const sync = (): void => {
    dockOn = heroOut && !prevIn && !footIn;
  };
  if (hero) {
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      heroOut = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    });
    io.observe(hero);
    observers.push(io);
  }
  if (preview) {
    const io = new IntersectionObserver(
      (entries) => {
        prevIn = entries[0]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0.25 },
    );
    io.observe(preview);
    observers.push(io);
  }
  const foot = document.querySelector('.axf');
  if (foot) {
    const io = new IntersectionObserver((entries) => {
      footIn = entries[0]?.isIntersecting ?? false;
      sync();
    });
    io.observe(foot);
    observers.push(io);
  }
  const onResize = (): void => drawOrbit();
  window.addEventListener('resize', onResize);
  return () => {
    for (const io of observers) io.disconnect();
    window.removeEventListener('resize', onResize);
  };
});

$effect(() => {
  stats.fix;
  stats.check;
  overrides;
  void tick().then(drawOrbit);
});
</script>

<div class="crumbs-bar">
  <nav class="crumbs" aria-label={t('hub.crumbs')}>
    <ol>
      <li><a href={`/rapport?id=${encodeURIComponent(auditId)}`}>{t('report.heading')} {host}</a></li>
      <li>{t('brief.crumb.ai')}</li>
      <li aria-current="page">{t('brief.crumb.here')}</li>
    </ol>
  </nav>
  {#if verified}<span class="verified"><i aria-hidden="true"></i>{t('brief.verified')}</span>{/if}
</div>

<header class="hero" id="hero" bind:this={hero}>
  <div>
    <a class="back intro" href={`/rapport?id=${encodeURIComponent(auditId)}`}>{t('brief.back', { host })}</a><br>
    <span class="chip intro"><i aria-hidden="true"></i>{t('brief.sync')}</span>
    <h1 id="t-h1"><span class="w"><span>{t('brief.h1.1')}</span></span> <span class="w"><span>{t('brief.h1.2')}</span></span> <span class="w"><span>{t('brief.h1.3')}</span></span> <span class="w"><span class="grad">{t('brief.h1.4')}</span></span> <span class="w"><span class="grad">{t('brief.h1.5')}</span></span></h1>
    <p class="lead intro">{t('brief.lead')}</p>
    <ul class="stats intro" aria-label={t('brief.stats')}>
      <li class="stat"><b>{stats.total}</b><span>{t('brief.total')}</span></li>
      <li class="stat stat-fix"><b>{stats.fix}</b><span>{t('brief.tofix')}</span></li>
      <li class="stat stat-check"><b>{stats.check}</b><span>{t('brief.tocheck')}</span></li>
      <li class="stat"><b>{stats.skip}</b><span>{t('brief.toskip')}</span></li>
    </ul>
    <div class="intro">
      <p class="presets-l">{t('brief.presets')}</p>
      <div class="presets" role="group" aria-label={t('brief.presets')}>
        <button type="button" class="chipbtn" onclick={() => applyPreset('rec')}>{t('brief.rec')}</button>
        <button type="button" class="chipbtn" onclick={() => applyPreset('crit')}>{t('brief.crit')}</button>
        <button type="button" class="chipbtn" onclick={() => applyPreset('all')}>{t('brief.all')}</button>
        <button type="button" class="chipbtn" onclick={() => applyPreset('none')}>{t('brief.none')}</button>
      </div>
    </div>
  </div>
  <figure class="intro">
    <div class="orbit-wrap"><canvas id="orbit" bind:this={canvas} aria-hidden="true" onpointerdown={(event) => { const id = hitDomain(event); if (id) open = id; }}></canvas></div>
    <figcaption>
      <ul class="legend">
        <li><i style="background:var(--peach2)"></i>{t('brief.leg.fix')}</li>
        <li><i style="background:var(--teal)"></i>{t('brief.leg.check')}</li>
        <li><i style="background:var(--peach)"></i>{t('brief.leg.skip')}</li>
      </ul>
      <p class="hint">{t('brief.hint')}</p>
    </figcaption>
  </figure>
</header>

<section id="domains-sec" aria-labelledby="t-dom">
  <div class="block-h">
    <div>
      <p class="eyebrow">{t('brief.step1')}</p>
      <h2 id="t-dom">{t('brief.dom.h')}</h2>
      <p class="sub">{t('brief.dom.p')}</p>
    </div>
  </div>
  <div id="domains">
    {#each domains as domain, index (domain.id)}
      {#if domain.locked}
        <article class="dom dom-off" id={`dom-${domain.id}`}>
          <span class="tile"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICONS[domain.id]}</svg></span>
          <h3 class="dom-name">{index + 1}. {domain.name}</h3>
          <span class="grade">{t('brief.locked')}</span>
        </article>
      {:else if domain.untested}
        <article class="dom dom-off" id={`dom-${domain.id}`}>
          <span class="tile"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICONS[domain.id]}</svg></span>
          <h3 class="dom-name">{index + 1}. {domain.name}</h3>
          <a class="btn btn-ghost" href={`/domaine?id=${encodeURIComponent(auditId)}&domaine=${domain.id}`}>{t('brief.launch')}</a>
        </article>
      {:else}
        {@const dots = domainDots(domain.id)}
        <article class="dom" class:open={open === domain.id} id={`dom-${domain.id}`}>
          <h3 class="dom-h">
            <button type="button" class="dom-btn" id={`btn-${domain.id}`} aria-expanded={open === domain.id} aria-controls={`panel-${domain.id}`} onclick={() => { open = open === domain.id ? '' : domain.id; }}>
              <span class="tile"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICONS[domain.id]}</svg></span>
              <span class="dom-name">{index + 1}. {domain.name}</span>
              {#if domain.grade}<span class="grade g-{domain.grade.toLowerCase()}">{t('brief.grade', { grade: domain.grade, score: Math.round(domain.score ?? 0) })}</span>{/if}
              <span class="dom-count">{domain.issues.length > 1 ? t('brief.n.many', { n: domain.issues.length }) : t('brief.n.one', { n: domain.issues.length })}</span>
              <span class="grow"></span>
              <span class="dom-sum">
                {#if dots.fix}<span class="dot dot-fix">{t('brief.dot.fix', { n: dots.fix })}</span>{/if}
                {#if dots.check}<span class="dot dot-check">{t('brief.dot.check', { n: dots.check })}</span>{/if}
                {#if dots.skip}<span class="dot dot-skip">{dots.skip > 1 ? t('brief.dot.skip.many', { n: dots.skip }) : t('brief.dot.skip.one', { n: dots.skip })}</span>{/if}
              </span>
              <svg class="chev" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </h3>
          <div class="panel" id={`panel-${domain.id}`} role="region" aria-labelledby={`btn-${domain.id}`}>
            <div class="panel-in"><div class="issues">
              {#each domain.issues as issue (issue.checkId)}
                <div class="issue">
                  <div class="issue-txt">
                    <div class="issue-head"><span class="sev sev-{sev(issue)}">{sev(issue) === 'crit' ? t('brief.sev.crit') : sev(issue) === 'imp' ? t('brief.sev.imp') : t('brief.sev.mod')}</span><h4>{issue.title}</h4></div>
                    <p>{issue.why}</p>
                  </div>
                  <fieldset class="seg3">
                    <legend class="sr-only">{t('brief.act.for', { title: issue.title })}</legend>
                    {#each [['skip', 'brief.act.skip'], ['check', 'brief.act.check'], ['fix', 'brief.act.fix']] as option (option[0])}
                      <label><input type="radio" name={issue.checkId} value={option[0]} checked={modeOf(issue) === option[0]} onchange={() => setMode(issue.checkId, option[0] as Mode)}><span>{t(option[1] as MessageKey)}</span></label>
                    {/each}
                  </fieldset>
                </div>
              {/each}
            </div></div>
          </div>
        </article>
      {/if}
    {/each}
  </div>
  <noscript><p class="sub">{t('brief.noscript')}</p></noscript>
</section>

<section id="preview" aria-labelledby="t-prev" bind:this={preview}>
  <div class="block-h">
    <div>
      <p class="eyebrow">{t('brief.step2')}</p>
      <h2 id="t-prev">{t('brief.preview.h')}</h2>
      <p class="sub">{t('brief.preview.p')} <code class="mono">{t('brief.file')}</code></p>
    </div>
  </div>
  <div class="mdwin">
    <div class="md-bar">
      <div class="md-file"><span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>{t('brief.file')}</div>
      <div class="md-meta"><span>{t('brief.meta')}</span><span id="tok">{t('brief.tokens', { n: tokenCount })}</span></div>
    </div>
    <div class="mdbody" id="md" tabindex="0" role="region" aria-label={t('brief.md')}>{@html previewHtml}</div>
    <div class="md-actions">
      <button class="btn btn-primary" type="button" onclick={copyPrompt}>{t('brief.copy')}</button>
      <button class="btn btn-ghost" type="button" onclick={download}>{t('brief.dl')}</button>
      <button class="btn btn-ghost" type="button" onclick={() => window.print()}>{t('brief.pdf')}</button>
      <a class="btn btn-ghost" href={`/plan?id=${encodeURIComponent(auditId)}`}>{t('brief.plan')}</a>
    </div>
    <p class="md-foot">{t('brief.foot')}</p>
  </div>
</section>

<div class="dock" class:show={dockOn} role="region" aria-label={t('brief.dock')}>
  <span class="dock-t">{t('brief.dock.line', { fix: stats.fix, check: stats.check })}</span>
  <button class="btn btn-primary" type="button" onclick={copyPrompt}>{t('brief.dock.copy')}</button>
</div>
<p class="sr-only" id="live" role="status" aria-live="polite"></p>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
