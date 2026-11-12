<script lang="ts">
import { onMount, tick } from 'svelte';
import { formatDate, type MessageKey, t } from '../i18n/index.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { gradeForScore, gradeLabel } from '../lib/grade.js';
import { GLOBAL_SERIES, type HistoryPoint } from '../lib/history.js';
import { relaunchHref } from '../lib/relaunch.js';
import { loadSiteHistory } from '../lib/site-history.js';
import {
  parseSiteRoute,
  SITE_SECTIONS,
  type SiteSection,
  sectionOf,
} from '../lib/site-route.js';
import HistoryBoard from './HistoryBoard.svelte';
import SessionWall from './SessionWall.svelte';
import SiteShare from './SiteShare.svelte';
import VerificationPanel from './VerificationPanel.svelte';
import SectionDock from './v6/SectionDock.svelte';

/**
 * `/sites/:host` (STRUCTURE.md §4) : une page par site suivi, quatre
 * sections — audits, historique, vérification, partage. Le site est lu
 * par hôte dans le compte connecté ; un hôte inconnu ne révèle rien.
 */
interface SiteRow {
  id: string;
  url: string;
  label: string;
  host: string;
  hosting: string;
  isPublic: boolean;
  publicSlug: string | null;
  exposeSecurity: boolean;
}

const TAB: Record<SiteSection, MessageKey> = {
  audits: 'st.tab.audits',
  historique: 'st.tab.historique',
  verification: 'st.tab.verification',
  partage: 'st.tab.partage',
};
const GUIDE: Record<SiteSection, MessageKey> = {
  audits: 'st.guide.audits',
  historique: 'st.guide.historique',
  verification: 'st.guide.verification',
  partage: 'st.guide.partage',
};

let mode = $state<'pending' | 'out' | 'missing' | 'ready'>('pending');
let site = $state<SiteRow | null>(null);
let plan = $state<string | null>(null);
let points = $state<HistoryPoint[]>([]);
let active = $state<SiteSection>('audits');

const latest = $derived(points[0] ?? null);
const sections = $derived(
  SITE_SECTIONS.map((id) => ({ id, label: t(TAB[id]) })),
);

function scoreOf(point: HistoryPoint): number | null {
  const value = point.scores[GLOBAL_SERIES];
  return typeof value === 'number' ? Math.round(value) : null;
}

function gradeOf(point: HistoryPoint) {
  return gradeForScore(scoreOf(point));
}

async function load(): Promise<void> {
  const route = parseSiteRoute(location.pathname);
  if (route.kind !== 'host') {
    mode = 'missing';
    return;
  }
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) {
    mode = 'out';
    return;
  }
  const [{ data: found }, { data: profile }] = await Promise.all([
    supabase
      .from('sites')
      .select(
        'id, url, label, host, hosting, is_public, public_slug, expose_security',
      )
      .eq('owner_id', session.user.id)
      .eq('host', route.host)
      .is('deleted_at', null)
      .order('url', { ascending: true }),
    supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.user.id)
      .maybeSingle(),
  ]);
  // Plusieurs sites sur le même hôte (portée par chemin) : `?site=` choisit.
  const rows = Array.isArray(found) ? found : found ? [found] : [];
  const asked = new URLSearchParams(location.search).get('site');
  const row = rows.find((item) => item.id === asked) ?? rows[0];
  if (!row || typeof row.id !== 'string') {
    mode = 'missing';
    return;
  }
  plan = typeof profile?.plan === 'string' ? profile.plan : null;
  site = {
    id: row.id,
    url: typeof row.url === 'string' ? row.url : `https://${route.host}`,
    label: typeof row.label === 'string' ? row.label : '',
    host: typeof row.host === 'string' ? row.host : route.host,
    hosting: typeof row.hosting === 'string' ? row.hosting : 'other',
    isPublic: row.is_public === true,
    publicSlug: typeof row.public_slug === 'string' ? row.public_slug : null,
    exposeSecurity: row.expose_security === true,
  };
  mode = 'ready';
  const view = await loadSiteHistory(site.id, site.hosting, plan);
  points = [...(view?.points ?? [])].sort((a, b) => b.at.localeCompare(a.at));
}

function sync(): void {
  const line = window.innerHeight * 0.35;
  let current: SiteSection = 'audits';
  for (const id of SITE_SECTIONS) {
    const top = document.getElementById(id)?.getBoundingClientRect().top;
    if (top !== undefined && top <= line) current = id;
  }
  active = current;
}

onMount(() => {
  void load().then(async () => {
    if (mode !== 'ready') return;
    await tick();
    // Les sections arrivent après le premier rendu : l’ancre est rejouée.
    if (location.hash !== '') {
      document
        .getElementById(sectionOf(location.hash))
        ?.scrollIntoView({ block: 'start' });
    }
    sync();
  });
  window.addEventListener('scroll', sync, { passive: true });
  return () => window.removeEventListener('scroll', sync);
});
</script>

<main id="contenu" class="st" tabindex="-1">
  {#if mode === 'pending'}
    <p class="st-wait" role="status">{t('st.loading')}</p>
  {:else if mode === 'out'}
    <div class="st-wrap"><SessionWall title={t('st.need_login')} next={`${location.pathname}${location.hash}`} /></div>
  {:else if mode === 'missing' || !site}
    <section class="st-wrap st-missing" aria-labelledby="st-h1">
      <h1 id="st-h1">{t('st.missing.title')}</h1>
      <p>{t('st.missing.lead')}</p>
      <p><a class="btn" href="/sites">{t('st.missing.back')}</a></p>
    </section>
  {:else}
    <header class="st-wrap st-head" data-dock-hide>
      <nav class="st-crumbs" aria-label={t('st.crumbs')}>
        <ol><li><a href="/sites">{t('nav.sites.long')}</a></li><li><span aria-current="page" data-i18n-skip>{site.host}</span></li></ol>
      </nav>
      <p class="st-eyebrow"><span class="st-dot" aria-hidden="true"></span>{t('st.eyebrow')}</p>
      <h1 class="st-h1" data-i18n-skip>{#each site.host.split('.') as part, index}{#if index > 0}.<wbr />{/if}{part}{/each}</h1>
      {#if site.label && site.label !== site.host}<p class="st-label">{site.label}</p>{/if}
      <p class="st-lede">{t('st.lede')}</p>
      <div class="st-meta">
        {#if latest}
          {@const grade = gradeOf(latest)}
          {#if grade}<span class="st-grade" data-g={grade} title={gradeLabel(grade)}>{grade}</span>{/if}
          <span>{t('st.last', { date: formatDate(new Date(latest.at)) })}</span>
        {:else}
          <span>{t('st.never')}</span>
        {/if}
      </div>
      <div class="st-acts">
        <a class="btn" href={relaunchHref(site.id, site.url)}>{t('st.relaunch')}</a>
        {#if latest}<a class="btn btn--ghost" href={latest.href}>{t('st.report')}</a>{/if}
      </div>
      <nav class="st-tabs" aria-label={t('st.tabs.label')}>
        <ol>
          {#each SITE_SECTIONS as id, index}
            <li><a class="st-tab" href={`#${id}`} aria-current={active === id ? 'location' : undefined}><span class="st-n" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span class="st-tl">{t(TAB[id])}</span><span class="st-g">{t(GUIDE[id])}</span></a></li>
          {/each}
        </ol>
      </nav>
    </header>

    <section id="audits" class="st-wrap st-sec" aria-labelledby="st-audits">
      <h2 id="st-audits">{t('st.audits.title')}</h2>
      <p class="st-sl">{t('st.audits.lead')}</p>
      {#if points.length === 0}
        <p class="st-empty">{t('st.audits.empty')}</p>
      {:else}
        <ol class="st-list">
          {#each points as point, index (point.id)}
            {@const score = scoreOf(point)}
            {@const grade = gradeOf(point)}
            <li class="st-row">
              <span class="st-grade" data-g={grade ?? 'none'} aria-hidden="true">{grade ?? '–'}</span>
              <span class="st-rb">
                <time datetime={point.at}>{formatDate(new Date(point.at))}</time>
                <span class="st-rs">{grade && score !== null ? `${grade} · ${score} · ${gradeLabel(grade)}` : t('st.audits.noscore')}{#if index === 0}<b class="st-new">{t('st.audits.latest')}</b>{/if}</span>
                <code class="st-ref">{t('st.audits.ref', { ref: point.id.slice(-6) })}</code>
              </span>
              <a class="btn-s" href={point.href}>{t('st.audits.open')}<span class="sr"> · {formatDate(new Date(point.at))}</span></a>
            </li>
          {/each}
        </ol>
      {/if}
      {#if plan !== 'pro'}
        <p class="st-depth">{t('st.audits.depth')} <a class="st-lnk" href="/pro">{t('st.audits.depth.cta')}</a></p>
      {/if}
    </section>

    <section id="historique" class="st-sec st-embed hs" aria-label={t('st.tab.historique')}>
      <HistoryBoard siteId={site.id} embedded />
    </section>

    <section id="verification" class="st-sec st-embed pv" aria-label={t('st.tab.verification')}>
      <VerificationPanel siteId={site.id} embedded />
    </section>

    <section id="partage" class="st-wrap st-sec" aria-labelledby="st-partage">
      <h2 id="st-partage">{t('st.partage.title')}</h2>
      <p class="st-sl">{t('st.partage.lead')}</p>
      <div class="st-share">
        <SiteShare site={{ id: site.id, label: site.label || site.host, isPublic: site.isPublic, publicSlug: site.publicSlug, exposeSecurity: site.exposeSecurity }} />
      </div>
      <p><a class="st-lnk" href="/compte#acces-partages">{t('st.partage.access')}</a></p>
    </section>
    <SectionDock {sections} />
  {/if}
</main>
