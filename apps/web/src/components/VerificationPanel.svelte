<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import {
  checkVerification,
  createVerification,
  isVerificationError,
  type VerificationView,
} from '../lib/verify-api.js';
import { localChallenge } from '../lib/verify-challenge.js';
import { guidesFor, type VerifyMethod } from '../lib/verify-guides.js';

interface SiteRow {
  id: string;
  url: string;
  label: string;
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

interface StoredVerification {
  id: string;
  method: VerifyMethod;
  status: string;
  token: string;
  found: boolean | null;
}

const METHODS = [
  'meta',
  'html_file',
  'well_known',
  'dns_txt',
  'search_console',
] as const;

let loading = $state(true);
let needLogin = $state(false);
let missing = $state(false);
let notFound = $state(false);
let error = $state('');
let notice = $state('');
let pending = $state(false);
let site = $state<SiteRow | null>(null);
let rows = $state<StoredVerification[]>([]);
let method = $state<VerifyMethod>('meta');
let reportId = $state<string | null>(null);
let sim = $state<'ok' | 'fail' | null>(null);
let accessToken = '';

function isMethod(value: string): value is VerifyMethod {
  return (
    value === 'dns_txt' ||
    value === 'file' ||
    value === 'html_file' ||
    value === 'meta' ||
    value === 'well_known' ||
    value === 'search_console'
  );
}

function current(): StoredVerification | null {
  return rows.find((row) => row.method === method) ?? null;
}

function sharedToken(): string {
  return current()?.token ?? rows[0]?.token ?? '';
}

function methodLabel(value: VerifyMethod): string {
  if (value === 'dns_txt') return t('verify.method.dns');
  if (value === 'file') return t('verify.method.file');
  if (value === 'html_file') return t('verify.method.html');
  if (value === 'well_known') return t('verify.method.well_known');
  if (value === 'search_console') return t('verify.method.gsc');
  return t('verify.method.meta');
}

function methodHint(value: VerifyMethod): string {
  if (value === 'dns_txt') return t('preuve.hint.dns');
  if (value === 'html_file' || value === 'file') return t('preuve.hint.file');
  if (value === 'well_known') return t('preuve.hint.known');
  if (value === 'search_console') return t('preuve.hint.gsc');
  return t('preuve.hint.meta');
}

function phaseOf(row: StoredVerification | null): 'idle' | 'ok' | 'fail' {
  if (!row) return 'idle';
  if (row.status === 'verified') return 'ok';
  if (row.status === 'failed' || row.status === 'expired') return 'fail';
  if (row.found === false) return 'fail';
  return 'idle';
}

onMount(() => {
  void load();
});

async function load(): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) {
    loading = false;
    needLogin = true;
    return;
  }
  const params = new URLSearchParams(location.search);
  const siteId = params.get('site');
  if (!siteId) {
    loading = false;
    missing = true;
    return;
  }
  accessToken = session.access_token;
  const { data: siteRow, error: siteError } = await supabase
    .from('sites')
    .select('id, url, label, host, scope, path_prefix')
    .eq('id', siteId)
    .eq('owner_id', session.user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (siteError || !siteRow) {
    loading = false;
    notFound = true;
    return;
  }
  site = {
    id: siteRow.id,
    url: siteRow.url,
    label: siteRow.label,
    host: siteRow.host,
    scope: siteRow.scope === 'path' ? 'path' : 'origin',
    pathPrefix: siteRow.path_prefix,
  };
  const { data: proofs, error: proofError } = await supabase
    .from('site_verifications')
    .select('id, method, status, token, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  const audits = await supabase
    .from('audits')
    .select('id, status, finished_at')
    .eq('site_id', siteId)
    .in('status', ['done', 'partial'])
    .order('finished_at', { ascending: false })
    .limit(1);
  loading = false;
  if (proofError) {
    error = t('verify.error');
    return;
  }
  reportId = audits.data?.[0]?.id ?? null;
  rows = (proofs ?? []).flatMap((row) =>
    isMethod(row.method)
      ? [
          {
            id: row.id,
            method: row.method,
            status: row.status,
            token: row.token,
            found: null,
          },
        ]
      : [],
  );
  const first = rows[0];
  if (first && first.method !== 'search_console') method = first.method;
}

function remember(view: VerificationView, nextMethod: VerifyMethod): void {
  const next: StoredVerification = {
    id: view.id,
    method: nextMethod,
    status: view.status,
    token: view.token,
    found: typeof view.found === 'boolean' ? view.found : null,
  };
  rows = [
    next,
    ...rows.filter((row) => row.method !== nextMethod && row.id !== next.id),
  ];
}

async function ensureRow(): Promise<StoredVerification | null> {
  if (!site) return null;
  const existing = current();
  if (existing) return existing;
  const created = await createVerification(accessToken, site.id, method);
  if (isVerificationError(created)) {
    error = created.error;
    return null;
  }
  remember(created, method);
  return current();
}

async function onCreate(): Promise<void> {
  if (!site || pending || method === 'search_console') return;
  error = '';
  notice = '';
  pending = true;
  await ensureRow();
  pending = false;
}

async function onCheck(): Promise<void> {
  if (!site || pending || method === 'search_console') return;
  error = '';
  notice = '';
  pending = true;
  const row = await ensureRow();
  if (!row) {
    pending = false;
    return;
  }
  const result = await checkVerification(accessToken, row.id);
  pending = false;
  if (isVerificationError(result)) {
    error = result.error;
    return;
  }
  remember(result, method);
}

async function onCopy(value: string): Promise<void> {
  error = '';
  try {
    await navigator.clipboard.writeText(value);
    notice = t('verify.copied');
  } catch {
    notice = '';
    error = t('verify.copy_failed');
  }
}
</script>

{#if loading}
  <p role="status">{t('verify.loading')}</p>
{:else if needLogin}
  <section class="khero" data-st="idle" aria-labelledby="h1">
    <h1 id="h1">{t('verify.title')}</h1>
    <p>{t('verify.consent')}</p>
    <p role="status">{t('verify.need_login')}</p>
    <p><a class="btn btn-primary" href={loginHref(`${location.pathname}${location.search}`)}>{t('nav.login')}</a></p>
  </section>
{:else if missing}
  <h1>{t('verify.missing')}</h1>
  <p><a class="btn btn-ghost" href="/sites">{t('verify.back')}</a></p>
{:else if notFound || !site}
  <h1>{t('verify.not_found')}</h1>
  <p><a class="btn btn-ghost" href="/sites">{t('verify.back')}</a></p>
{:else}
  {@const proof = current()}
  {@const token = sharedToken()}
  {@const challenge = token ? localChallenge(site, token) : null}
  {@const phase = pending ? 'checking' : phaseOf(proof)}
  <nav class="crumbs" aria-label={t('hub.crumbs')}><ol><li><a href="/sites">{t('nav.sites.long')}</a></li><li><a href={`/rapport?id=${encodeURIComponent(reportId ?? '')}`}>{site.label || site.host}</a></li><li><span aria-current="page">{t('preuve.crumb')}</span></li></ol></nav>
  <section class="khero" id="st" data-st={phase === 'checking' ? 'scan' : phase} aria-labelledby="h1">
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="hgrid">
      <div>
        <p class="eyebrow">{t('preuve.eyebrow')}</p>
        <h1 id="h1">{t('preuve.h1')} <span class="grad-txt">{site.host}</span></h1>
        <p class="lede">{t('preuve.lede')}</p>
        <div class="acts"><a class="btn btn-primary" href="#methodes">{t('preuve.choose')}</a>{#if reportId}<a class="btn btn-ghost" href={`/rapport?id=${encodeURIComponent(reportId)}`}>{t('preuve.report')}</a>{/if}</div>
      </div>
      <div class="orbx">
        <span class="fchip c1" aria-hidden="true"><i class="pulse"></i>{t('preuve.sondes')}</span>
        {#if token}<span class="fchip c2" aria-hidden="true"><b>TXT</b> {token.slice(0, 16)}…</span>{/if}
        <div class="gpanel orbw">
        <div class="orb" aria-hidden="true"><svg viewBox="0 0 300 300">
          <defs>
            <linearGradient id="shg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7091E6"/><stop offset="1" stop-color="#3D52A0"/></linearGradient>
            <linearGradient id="sho" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4CC48A"/><stop offset="1" stop-color="#1F7F52"/></linearGradient>
            <linearGradient id="shf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9895A"/><stop offset="1" stop-color="#B54708"/></linearGradient>
            <radialGradient id="sw" cx="0" cy="1" r="1"><stop offset="0" stop-color="#7091E6" stop-opacity=".55"/><stop offset="1" stop-color="#7091E6" stop-opacity="0"/></radialGradient>
          </defs>
          <circle class="ring" cx="150" cy="150" r="140"/><circle class="ring d" cx="150" cy="150" r="110"/><circle class="ring" cx="150" cy="150" r="80"/>
          <path class="sweep" d="M150 150 L150 10 A140 140 0 0 1 271 80 Z" fill="url(#sw)"/>
          <circle class="ping" cx="150" cy="150" r="140"/><circle class="ping" cx="150" cy="150" r="140"/>
          <g class="sat"><circle cx="150" cy="10" r="5"/><circle cx="260" cy="150" r="3.5" opacity=".6"/><circle cx="72" cy="240" r="4" opacity=".8"/></g>
          <path class="shield" d="M150 92l46 17v38c0 33-25 52-46 61-21-9-46-28-46-61v-38z"/>
          <text class="q" x="150" y="166" text-anchor="middle">?</text>
          <path class="mk ok" d="M130 151l14 14 27-30"/><path class="mk no" d="M134 134l32 32M166 134l-32 32"/>
        </svg></div>
        <h2 class="stl" id="orbt">
          {#if phase === 'checking'}{t('verify.state.checking.title')}
          {:else if phase === 'ok'}{t('verify.state.ok.title')}
          {:else if phase === 'fail'}{t('verify.state.fail.title')}
          {:else}{t('verify.state.idle.title')}{/if}
          <small>
            {#if phase === 'checking'}{t('verify.state.checking.body')}
            {:else if phase === 'ok'}{t('verify.state.ok.body')}
            {:else if phase === 'fail'}{t('verify.state.fail.body')}
            {:else}{t('verify.state.idle.body')}{/if}
          </small>
        </h2>
        <ol class="steps" aria-label={t('preuve.steps')}><li class="on"><b>1</b>{t('preuve.step.1')}</li><li><b>2</b>{t('preuve.step.2')}</li><li><b>3</b>{t('preuve.step.3')}</li></ol>
        </div>
      </div>
    </div>
  </section>
  {#if notice}<p role="status">{notice}</p>{/if}
  {#if error}<p class="form-error" role="alert">{error}</p>{/if}
  <section aria-labelledby="hw">
    <p class="kicker">{t('preuve.why.kicker')}</p>
    <h2 class="sec" id="hw">{t('preuve.why.title')}</h2>
    <p class="sec-lede">{t('preuve.why.lead')}</p>
    <div class="unl">
      <div class="ut rv"><div class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></div><h3>{t('preuve.unlock.1')}</h3><p>{t('preuve.unlock.1b')}</p></div>
      <div class="ut rv"><div class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg></div><h3>{t('preuve.unlock.2')}</h3><p>{t('preuve.unlock.2b')}</p></div>
      <div class="ut rv"><div class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg></div><h3>{t('preuve.unlock.3')}</h3><p>{t('preuve.unlock.3b')}</p></div>
      <div class="ut rv"><div class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg></div><h3>{t('preuve.unlock.4')}</h3><p>{t('preuve.unlock.4b')}</p><span class="soon">{t('preuve.later')}</span></div>
    </div>
  </section>
  <section class="blk" id="methodes" aria-labelledby="hm">
    <p class="kicker">{t('preuve.methods.kicker')}</p>
    <h2 class="sec" id="hm">{t('preuve.methods')}</h2>
    <p class="sec-lede">{t('preuve.methods.lead')}</p>
    {#if challenge}
      <div class="tokbar rv"><div><span class="tl">{t('preuve.token')}</span><code>{challenge.dnsValue}</code></div><button type="button" class="btn btn-sm" onclick={() => onCopy(challenge.dnsValue)}>{t('preuve.copy.token')}</button></div>
    {:else}
      <button class="btn btn-primary" type="button" disabled={pending} onclick={onCreate}>{pending ? t('verify.creating') : t('verify.create')}</button>
    {/if}
    <div class="tabs rv" role="tablist" aria-label={t('verify.method')}>
      {#each METHODS as item (item)}
        <button class="tab" type="button" role="tab" aria-selected={method === item} onclick={() => { method = item; }}>{methodLabel(item)}<small>{methodHint(item)}</small></button>
      {/each}
    </div>
    {#if method === 'dns_txt' && site.host.endsWith('.github.io')}
      <p>{t('verify.github.dns')}</p>
    {/if}
    {#if method === 'search_console'}
      <section class="card panel">
        <h3>{t('verify.method.gsc')} <span class="tag">{t('preuve.hint.gsc')}</span></h3>
        <p>{t('verify.gsc.later')}</p>
        <div class="prow">
          <a class="btn gbtn" href="/compte#search-console"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#fbbc05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>{t('preuve.google')}</a>
          <span class="secure"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>{t('preuve.google.secure')}</span>
        </div>
      </section>
    {:else}
      {#each guidesFor(method) as guide (guide.title)}
        <section class="card panel">
          <h3>{t(guide.title)} <span class="tag">{t('preuve.selected')}</span></h3>
          <ol class="guide">{#each guide.steps as step, index (step + String(index))}<li>{t(step)}</li>{/each}</ol>
        </section>
      {/each}
      {#if challenge}
        {#if method === 'meta'}
          <div class="code"><div class="hd"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span>{t('preuve.code.title')}</span><span class="ready">{t('preuve.code.ready')}</span></div><pre>{challenge.metaTag}</pre></div>
        {:else}
        <dl class="kv">
          {#if method === 'dns_txt'}
            <div><dt>{t('verify.record_name')}</dt><dd>{challenge.dnsName}</dd></div>
            <div><dt>{t('verify.record_value')}</dt><dd>{challenge.dnsValue}</dd></div>
          {:else if method === 'html_file'}
            <div><dt>{t('verify.html_url')}</dt><dd>{challenge.htmlFileUrl}</dd></div>
          {:else if method === 'well_known'}
            <div><dt>{t('verify.well_known_url')}</dt><dd>{challenge.wellKnownUrl}</dd></div>
          {:else if method === 'file'}
            <div><dt>{t('verify.file_url')}</dt><dd>{challenge.fileUrl}</dd></div>
          {/if}
        </dl>
        {/if}
        <div class="prow">
          {#if method === 'meta'}
            <button type="button" class="btn btn-ghost" onclick={() => onCopy(challenge.metaTag)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>{t('preuve.copy.snippet')}</button>
          {/if}
          <button class="btn btn-primary" type="button" disabled={pending} onclick={onCheck}>{pending ? t('verify.checking') : phase === 'fail' ? t('verify.retry') : t('verify.now')}</button>
        </div>
      {/if}
    {/if}
    <div class="sim"><span id="siml">{t('preuve.sim')}</span><div class="seg" role="group" aria-labelledby="siml"><button type="button" aria-pressed={sim !== 'fail'} onclick={() => { sim = 'ok'; }}>{t('preuve.sim.ok')}</button><button type="button" aria-pressed={sim === 'fail'} onclick={() => { sim = 'fail'; }}>{t('preuve.sim.fail')}</button></div></div>
  </section>
  <section class="blk" aria-labelledby="hs">
    <p class="kicker">{t('preuve.detect.kicker')}</p>
    <h2 class="sec" id="hs">{t('preuve.detect')}</h2>
    <div class="card stat" data-st={sim ?? (phase === 'checking' ? 'scan' : phase)} aria-live="polite">
      <div class="sbadge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
      <div>
        <div class="sv idle"><span class="badge b-nt">{t('preuve.sv.idle.b')}</span><h3>{t('preuve.sv.idle.t')}</h3><p>{t('preuve.sv.idle.p')}</p></div>
        <div class="sv scan"><span class="badge b-own">{t('preuve.sv.scan.b')}</span><h3>{t('preuve.sv.scan.t')}</h3><p>{t('preuve.sv.scan.p')}</p><div class="skl" aria-hidden="true"><span class="sk"></span><span class="sk"></span><span class="sk"></span></div></div>
        <div class="sv ok"><span class="badge b-ok">{t('preuve.sv.ok.b')}</span><h3>{t('preuve.sv.ok.t')}</h3><p>{t('preuve.sv.ok.p')}</p>{#if reportId}<div class="acts"><a class="btn btn-primary" href={`/rapport?id=${encodeURIComponent(reportId)}`}>{t('verify.report')}</a></div>{/if}</div>
        <div class="sv fail"><span class="badge b-crit">{t('preuve.sv.fail.b')}</span><h3>{t('preuve.sv.fail.t')}</h3><p>{t('preuve.sv.fail.p')}</p></div>
        <p class="auto">{t('preuve.detect.auto')}</p>
      </div>
    </div>
    <div class="alt">
      <div class="card"><h4>{t('preuve.alt.1')} <span class="badge b-nt">{t('preuve.alt.1t')}</span></h4><p>{t('preuve.alt.1b')}</p></div>
      <div class="card"><h4>{t('preuve.alt.2')} <span class="badge b-ok">{t('preuve.alt.2t')}</span></h4><p>{t('preuve.alt.2b')}</p></div>
      <div class="card"><h4>{t('preuve.alt.3')} <span class="badge b-fix">{t('preuve.alt.3t')}</span></h4><p>{t('preuve.alt.3b')}</p></div>
    </div>
  </section>
  <section class="blk" aria-labelledby="hg">
    <p class="kicker">{t('preuve.gov.kicker')}</p>
    <h2 class="sec" id="hg">{t('preuve.gov')}</h2>
    <ul class="gov">
      <li><span class="tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>{t('preuve.gov.1')}</li>
      <li><span class="tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>{t('preuve.gov.2')}</li>
      <li><span class="tk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>{t('preuve.gov.3')}</li>
    </ul>
  </section>
  <div class="dock" role="region" aria-label={t('preuve.choose')}>
    <p>{t('preuve.dock', { host: site.host, method: methodLabel(method) })}</p>
    <div class="r">
      <a class="btn btn-ghost btn-sm" href="/sites">{t('verify.back')}</a>
      {#if challenge && method !== 'search_console'}
        <button class="btn btn-primary btn-sm" type="button" disabled={pending} onclick={onCheck}>{pending ? t('verify.checking') : t('verify.now')}</button>
      {/if}
    </div>
  </div>
{/if}
