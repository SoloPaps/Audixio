<script lang="ts">
import { t } from '../i18n/index.js';
import { browserClient } from '../lib/browser-session.js';
import { badgeHref } from '../lib/hub-view.js';
import { shareIsOpen } from '../lib/public-score.js';

interface Props {
  auditId: string;
  host: string;
  open: boolean;
  onClose: () => void;
}

let { auditId, host, open, onClose }: Props = $props();
let link = $state('');
let notice = $state('');
let error = $state('');
let pending = $state(false);
let canNative = $state(false);
let dialog = $state<HTMLDivElement | null>(null);

const page = $derived(
  typeof location === 'undefined'
    ? ''
    : `${location.origin}/rapport?id=${encodeURIComponent(auditId)}`,
);

$effect(() => {
  if (!open) return;
  canNative = typeof navigator.share === 'function';
  queueMicrotask(() => dialog?.focus());
  notice = '';
  error = '';
  void load();
});

async function load(): Promise<void> {
  const supabase = browserClient();
  if (!supabase) return;
  const { data } = await supabase
    .from('reports')
    .select('share_token, visibility, revoked_at')
    .eq('audit_id', auditId)
    .eq('visibility', 'link')
    .is('revoked_at', null)
    .limit(1);
  const row = Array.isArray(data) ? data[0] : undefined;
  if (
    !row ||
    !shareIsOpen({ visibility: row.visibility, revokedAt: row.revoked_at })
  ) {
    link = '';
    return;
  }
  link = `${location.origin}/partage/${row.share_token}`;
}

async function create(): Promise<void> {
  const supabase = browserClient();
  if (!supabase || pending) return;
  pending = true;
  error = '';
  const { data, error: writeError } = await supabase
    .from('reports')
    .insert({ audit_id: auditId, visibility: 'link' })
    .select('share_token, visibility, revoked_at')
    .single();
  pending = false;
  if (writeError || !data?.share_token) {
    error = t('share.error');
    return;
  }
  link = `${location.origin}/partage/${data.share_token}`;
}

async function copy(): Promise<void> {
  const value = link || page;
  try {
    await navigator.clipboard.writeText(value);
    notice = t('share.copied');
  } catch {
    error = t('verify.copy_failed');
  }
}

async function native(): Promise<void> {
  if (typeof navigator.share !== 'function') return;
  await navigator.share({
    title: t('share.title'),
    url: link || page,
  });
}

function onKey(event: KeyboardEvent): void {
  if (open && event.key === 'Escape') onClose();
}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <button class="scrim" type="button" aria-label={t('share.close')} onclick={onClose}></button>
  <div class="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" tabindex="-1" bind:this={dialog}>
    <h2 id="share-title">{t('share.title')}</h2>
    <p>{t('share.lead', { host })}</p>
    {#if link}
      <div class="share-link">
        <input readonly value={link} aria-label={t('share.copy')} />
        <button class="btn-primary" type="button" onclick={copy}>{t('share.copy')}</button>
      </div>
    {:else}
      <p>{t('share.notyet')}</p>
      <button class="btn-primary" type="button" disabled={pending} onclick={create}>
        {t('share.create')}
      </button>
    {/if}
    {#if notice}<p role="status">{notice}</p>{/if}
    {#if error}<p role="alert">{error}</p>{/if}
    {#if canNative}
      <p><button class="btn-ghost" type="button" onclick={native}>{t('share.native')}</button></p>
    {/if}
    <p>
      <a href={badgeHref(auditId)}>{t('share.badge')}</a>
      <span>{t('share.badge.hint')}</span>
    </p>
    <button class="btn-ghost" type="button" onclick={onClose}>{t('share.close')}</button>
  </div>
{/if}
