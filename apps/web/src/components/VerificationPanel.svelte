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
  <p role="status">{t('verify.need_login')}</p>
  <p>
    <a class="link-action" href={loginHref(`${location.pathname}${location.search}`)}>
      {t('nav.login')}
    </a>
  </p>
{:else if missing}
  <p role="status">{t('verify.missing')}</p>
  <p><a class="link-action" href="/sites">{t('verify.back')}</a></p>
{:else if notFound || !site}
  <p role="status">{t('verify.not_found')}</p>
  <p><a class="link-action" href="/sites">{t('verify.back')}</a></p>
{:else}
  {@const proof = current()}
  {@const token = sharedToken()}
  {@const challenge = token ? localChallenge(site, token) : null}
  {@const phase = pending ? 'checking' : phaseOf(proof)}
  <p class="kicker">{site.label}</p>
  <p>{site.url}</p>
  {#if notice}
    <p role="status">{notice}</p>
  {/if}
  {#if error}
    <p class="form-error" role="alert">{error}</p>
  {/if}
  <div role="tablist" aria-label={t('verify.method')}>
    {#each METHODS as item (item)}
      <button
        type="button"
        role="tab"
        aria-selected={method === item}
        onclick={() => {
          method = item;
        }}
      >
        {methodLabel(item)}
      </button>
    {/each}
  </div>
  {#if method === 'dns_txt' && site.host.endsWith('.github.io')}
    <p>{t('verify.github.dns')}</p>
  {/if}
  {#if method === 'search_console'}
    <p>{t('verify.gsc.later')}</p>
  {:else}
    {#each guidesFor(method) as guide (guide.title)}
      <section>
        <h2>{t(guide.title)}</h2>
        <ol class="steps">
          {#each guide.steps as step, index (step + String(index))}
            <li>{t(step)}</li>
          {/each}
        </ol>
      </section>
    {/each}
    {#if !token}
      <button class="button button-primary" type="button" disabled={pending} onclick={onCreate}>
        {pending ? t('verify.creating') : t('verify.create')}
      </button>
    {:else if challenge}
      <div class="challenge">
        <p>{t('verify.token')}</p>
        <pre>{challenge.dnsValue}</pre>
        <button class="button button-secondary" type="button" onclick={() => onCopy(challenge.dnsValue)}>
          {t('verify.copy')}
        </button>
        {#if method === 'dns_txt'}
          <p>{t('verify.record_name')}</p>
          <pre>{challenge.dnsName}</pre>
          <p>{t('verify.record_value')}</p>
          <pre>{challenge.dnsValue}</pre>
        {:else if method === 'html_file'}
          <p>{t('verify.html_url')}</p>
          <pre>{challenge.htmlFileUrl}</pre>
        {:else if method === 'well_known'}
          <p>{t('verify.well_known_url')}</p>
          <pre>{challenge.wellKnownUrl}</pre>
        {:else if method === 'file'}
          <p>{t('verify.file_url')}</p>
          <pre>{challenge.fileUrl}</pre>
        {:else}
          <p>{t('verify.meta_tag')}</p>
          <pre>{challenge.metaTag}</pre>
          <button class="button button-secondary" type="button" onclick={() => onCopy(challenge.metaTag)}>
            {t('verify.copy')}
          </button>
        {/if}
      </div>
      <button class="button button-primary" type="button" disabled={pending} onclick={onCheck}>
        {pending ? t('verify.checking') : phase === 'fail' ? t('verify.retry') : t('verify.now')}
      </button>
    {/if}
  {/if}
  <section aria-live="polite">
    {#if phase === 'checking'}
      <h2>{t('verify.state.checking.title')}</h2>
      <p>{t('verify.state.checking.body')}</p>
    {:else if phase === 'ok'}
      <h2>{t('verify.state.ok.title')}</h2>
      <p>{t('verify.state.ok.body')}</p>
      {#if reportId}
        <p><a class="link-action" href={`/rapport?id=${encodeURIComponent(reportId)}`}>{t('verify.report')}</a></p>
      {/if}
    {:else if phase === 'fail'}
      <h2>{t('verify.state.fail.title')}</h2>
      <p>{t('verify.state.fail.body')}</p>
    {:else}
      <h2>{t('verify.state.idle.title')}</h2>
      <p>{t('verify.state.idle.body')}</p>
    {/if}
    <p>{t('verify.recheck')}</p>
  </section>
  <p class="page-links">
    <a class="link-action" href="/sites">{t('verify.back')}</a>
  </p>
{/if}
