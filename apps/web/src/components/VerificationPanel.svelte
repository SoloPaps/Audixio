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
  <section class="khero" id="st" data-st={phase === 'checking' ? 'run' : phase} aria-labelledby="h1">
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="hgrid">
      <div>
        <p class="eyebrow">{t('preuve.eyebrow')}</p>
        <h1 id="h1">{t('preuve.h1')} <span class="grad-txt">{site.host}</span></h1>
        <p class="lede">{t('preuve.lede')}</p>
        <p>{t('verify.consent')}</p>
        <p>{t('verify.legal_law')}</p>
        <div class="acts"><a class="btn btn-primary" href="#methodes">{t('preuve.choose')}</a></div>
      </div>
      <div class="gpanel">
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
      <div class="ut rv"><h3>{t('preuve.unlock.1')}</h3><p>{t('preuve.unlock.1b')}</p></div>
      <div class="ut rv"><h3>{t('preuve.unlock.2')}</h3><p>{t('preuve.unlock.2b')}</p></div>
      <div class="ut rv"><h3>{t('preuve.unlock.3')}</h3><p>{t('preuve.unlock.3b')}</p></div>
      <div class="ut rv"><h3>{t('preuve.unlock.4')}</h3><p>{t('preuve.unlock.4b')}</p><span class="soon">{t('preuve.later')}</span></div>
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
        <button class="tab" type="button" role="tab" aria-selected={method === item} onclick={() => { method = item; }}>{methodLabel(item)}</button>
      {/each}
    </div>
    {#if method === 'dns_txt' && site.host.endsWith('.github.io')}
      <p>{t('verify.github.dns')}</p>
    {/if}
    {#if method === 'search_console'}
      <p>{t('verify.gsc.later')}</p>
    {:else}
      {#each guidesFor(method) as guide (guide.title)}
        <section class="panel">
          <h3>{t(guide.title)}</h3>
          <ol class="steps">{#each guide.steps as step, index (step + String(index))}<li>{t(step)}</li>{/each}</ol>
        </section>
      {/each}
      {#if challenge}
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
          {:else}
            <div><dt>{t('verify.meta_tag')}</dt><dd>{challenge.metaTag}</dd><button type="button" class="btn btn-ghost btn-sm" onclick={() => onCopy(challenge.metaTag)}>{t('verify.copy')}</button></div>
          {/if}
        </dl>
        <div class="prow">
          <button class="btn btn-primary" type="button" disabled={pending} onclick={onCheck}>{pending ? t('verify.checking') : phase === 'fail' ? t('verify.retry') : t('verify.now')}</button>
        </div>
      {/if}
    {/if}
  </section>
  <section class="blk" aria-live="polite">
    <div class="sv {phase}">
      {#if phase === 'ok' && reportId}
        <p><a class="btn btn-primary" href={`/rapport?id=${encodeURIComponent(reportId)}`}>{t('verify.report')}</a></p>
      {/if}
      <p>{t('verify.recheck')}</p>
    </div>
  </section>
  <div class="dock" role="region" aria-label={t('preuve.choose')}>
    <p>{site.host}</p>
    <div class="r"><a class="btn btn-ghost btn-sm" href="/sites">{t('verify.back')}</a></div>
  </div>
{/if}
