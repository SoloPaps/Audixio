<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { badgeEmbed, badgePublicHref } from '../lib/badge-embed.js';
import {
  badgeTargetHref,
  linkErrorKey,
  shareTokenOf,
} from '../lib/badge-target.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { gradeForScore } from '../lib/grade.js';
import { say } from '../lib/motion.js';
import { loginHref, signupHref } from '../lib/nav.js';

interface Props {
  auditId: string;
  host: string;
  verified: boolean;
  score: number | null;
  /** Visiteur sans compte : pas de lien public possible. */
  guest?: boolean;
}

let { auditId, host, verified, score, guest = false }: Props = $props();

let style = $state<'complet' | 'compact' | 'pastille'>('complet');
let link = $state('');
let shareToken = $state<string | null>(null);
let dialog = $state<HTMLElement | null>(null);
let copied = $state<'code' | 'link' | ''>('');
let loaded = $state(false);
let pending = $state(false);
let error = $state('');

const grade = $derived(verified ? gradeForScore(score) : null);
const rapport = $derived(`/rapport?id=${encodeURIComponent(auditId)}`);
const target = $derived(
  badgeTargetHref({ origin: location.origin, shareToken, guest }),
);
// Compte sans lien public : pas de code, d’abord le lien (jamais /rapport).
const needsLink = $derived(!guest && loaded && target === null);
const snippet = $derived.by(() => {
  if (target === null) return '';
  const alt = grade ? `${t('brand.ui')} : ${grade}` : t('brand.ui');
  return badgeEmbed({
    style,
    href: target,
    origin: location.origin,
    alt,
    label: t('badge.by'),
    grade,
  });
});

const styles = [
  ['complet', 'badge.full', 'badge.full.d'],
  ['compact', 'badge.compact', 'badge.compact.d'],
  ['pastille', 'badge.pill', 'badge.pill.d'],
] as const;

async function loadLink(): Promise<void> {
  if (guest) return;
  const supabase = browserClient();
  if (!supabase) {
    loaded = true;
    return;
  }
  const { data } = await supabase
    .from('reports')
    .select('share_token, visibility, revoked_at')
    .eq('audit_id', auditId)
    .is('revoked_at', null)
    .limit(1);
  const row = Array.isArray(data) ? data[0] : null;
  shareToken =
    typeof row?.share_token === 'string' && row.share_token !== ''
      ? row.share_token
      : null;
  link = badgePublicHref(location.origin, shareToken);
  loaded = true;
}

async function createLink(): Promise<void> {
  if (pending) return;
  const session = await currentSession();
  const token = session?.access_token;
  if (!token) {
    error = t('share.error');
    return;
  }
  pending = true;
  error = '';
  const response = await fetch('/api/liens', {
    method: 'post'.toUpperCase(),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ auditId, kind: 'public' }),
  }).catch(() => null);
  const body = (await response?.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  pending = false;
  const created =
    response?.ok && typeof body?.url === 'string'
      ? shareTokenOf(body.url)
      : null;
  if (!created) {
    error = t(linkErrorKey(response?.status ?? null, body));
    return;
  }
  shareToken = created;
  link = badgePublicHref(location.origin, created);
  say(t('share.created'));
}

async function copy(kind: 'code' | 'link'): Promise<void> {
  const value = kind === 'code' ? snippet : link;
  if (!value) return;
  await navigator.clipboard.writeText(value);
  copied = kind;
  say(kind === 'code' ? t('badge.copied') : t('badge.copied.link'));
  window.setTimeout(() => {
    if (copied === kind) copied = '';
  }, 1600);
}

function onStyle(value: 'complet' | 'compact' | 'pastille'): void {
  style = value;
  const label =
    value === 'compact'
      ? t('badge.compact')
      : value === 'pastille'
        ? t('badge.pill')
        : t('badge.full');
  say(t('badge.style.say', { name: label }));
}

onMount(() => {
  void loadLink();
  dialog?.focus();
  const node = dialog;
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      location.assign(rapport);
      return;
    }
    if (event.key !== 'Tab' || !node) return;
    const items = [
      ...node.querySelectorAll<HTMLElement>('a[href],button,input,textarea'),
    ];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
});
</script>

<div class="bg" aria-hidden="true"><div class="fk"><div class="bar"></div><div class="hero"></div><div class="row"><i></i><i></i><i></i></div></div></div>
<div class="scrim" aria-hidden="true"></div>
<main class="wrap">
  <div class="dlg" id="contenu" role="dialog" aria-modal="true" aria-labelledby="bt" aria-describedby="bd" tabindex="-1" bind:this={dialog}>
    <a class="x" href={rapport} aria-label={t('badge.close')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></a>
    <p class="kicker">{grade ? t('badge.kicker', { host, grade }) : t('badge.kicker.plain', { host })}</p>
    <h1 id="bt">{t('badge.title')}</h1>
    <p class="lede muted" id="bd">{t('badge.lead')}</p>
    <fieldset class="vars">
      <legend>{t('badge.style')}</legend>
      {#each styles as item, index (item[0])}
        <div class="vo">
          <input type="radio" name="v" id={`v${index + 1}`} value={item[0]} checked={style === item[0]} onchange={() => onStyle(item[0])}>
          <label for={`v${index + 1}`}><b>{t(item[1])}</b><span>{t(item[2])}</span></label>
        </div>
      {/each}
    </fieldset>
    {#if needsLink}
      <div class="fld need-link">
        <p class="muted" id="need-link">{t('badge.needLink')}</p>
        <div class="acts"><button class="btn btn-primary" type="button" aria-describedby="need-link" disabled={pending} onclick={createLink}>{pending ? t('sites.share.creating') : t('badge.needLink.create')}</button></div>
        {#if error}<p class="muted" role="alert">{error}</p>{/if}
      </div>
    {:else if snippet}
      <div class="stage" role="region" aria-label={t('badge.preview')}>{@html snippet}</div>
      <div class="fld">
        <label for="code">{t('badge.code')}</label>
        <div class="cp"><textarea id="code" readonly spellcheck="false" value={snippet}></textarea><button class="btn btn-primary" class:ok={copied === 'code'} type="button" onclick={() => copy('code')}>{copied === 'code' ? t('badge.copied.short') : t('badge.copy')}</button></div>
      </div>
    {/if}
    {#if guest}
      <div class="fld">
        <p class="muted">{t('share.guest')}</p>
        <div class="acts"><a class="lk-pill" href={signupHref(`${location.pathname}${location.search}`)}>{t('share.guest.signup')}</a><a class="lk-pill" href={loginHref(`${location.pathname}${location.search}`)}>{t('guest.gate.login')}</a></div>
      </div>
    {:else if link}
      <div class="fld">
        <label for="lnk">{t('badge.link')}</label>
        <div class="cp"><input id="lnk" type="text" readonly value={link}><button class="btn btn-ghost" class:ok={copied === 'link'} type="button" disabled={!link} onclick={() => copy('link')}>{copied === 'link' ? t('badge.copied.short') : t('badge.copy.link')}</button></div>
      </div>
    {/if}
    <div class="foot">
      <p>{guest ? t('badge.foot.guest') : t('badge.foot')}</p>
      <div class="acts">
        <a class="lk-pill" href={rapport}>{t('badge.back')}</a>
        {#if link}<a class="lk-pill" href={link}>{t('badge.public')}</a>{/if}
      </div>
    </div>
  </div>
</main>
<div class="toast" id="toast" aria-hidden="true"></div>
<p class="sr-only" id="live" role="status" aria-live="polite"></p>
