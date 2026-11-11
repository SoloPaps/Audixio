<script lang="ts">
import { t } from '../i18n/index.js';
import { linkErrorKey } from '../lib/badge-target.js';
import { currentSession } from '../lib/browser-session.js';
import { badgeHref } from '../lib/hub-view.js';
import { loginHref, signupHref } from '../lib/nav.js';

interface Props {
  auditId: string;
  host: string;
  open: boolean;
  onClose: () => void;
}

let { auditId, host, open, onClose }: Props = $props();
let link = $state('');
let linkId = $state('');
let notice = $state('');
let error = $state('');
let pending = $state(false);
// Visiteur sans compte : aucun lien de partage (matrice, plafond 0).
let signedIn = $state<boolean | null>(null);
let copied = $state(false);
let canNative = $state(false);
let first = $state<HTMLElement | null>(null);
let dialog = $state<HTMLDivElement | null>(null);
let opener: HTMLElement | null = null;

$effect(() => {
  if (!open) return;
  opener = document.activeElement as HTMLElement | null;
  canNative =
    typeof navigator.share === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  notice = '';
  error = '';
  copied = false;
  document.documentElement.style.overflow = 'hidden';
  void load().then(() => queueMicrotask(() => first?.focus()));
  return () => {
    document.documentElement.style.overflow = '';
    opener?.focus();
  };
});

async function bearer(): Promise<string | null> {
  const session = await currentSession();
  return session?.access_token ?? null;
}

async function load(): Promise<void> {
  const token = await bearer();
  signedIn = Boolean(token);
  if (!token) {
    link = '';
    linkId = '';
    return;
  }
  const response = await fetch(
    `/api/liens?auditId=${encodeURIComponent(auditId)}`,
    {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    },
  );
  if (!response.ok) return;
  const body = (await response.json()) as {
    liens?: { id?: string; kind?: string; url?: string }[];
  };
  const row = body.liens?.find((item) => item.kind === 'public' && item.url);
  link = row?.url ? `${location.origin}${row.url}` : '';
  linkId = row?.id ?? '';
}

async function create(): Promise<void> {
  const token = await bearer();
  if (!token) {
    signedIn = false;
    return;
  }
  if (pending) {
    error = t('share.error');
    return;
  }
  pending = true;
  error = '';
  let response: Response;
  try {
    response = await fetch('/api/liens', {
      method: 'post'.toUpperCase(),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ auditId, kind: 'public' }),
    });
  } catch {
    pending = false;
    error = t('share.error');
    return;
  }
  const body = (await response.json().catch(() => null)) as {
    id?: string;
    url?: string;
    error?: string;
  } | null;
  pending = false;
  if (!response.ok || !body?.url?.startsWith('/partage/')) {
    error = t(linkErrorKey(response.status, body));
    return;
  }
  link = `${location.origin}${body.url}`;
  linkId = body.id ?? '';
  notice = t('share.created');
}

async function revoke(): Promise<void> {
  const token = await bearer();
  if (!token || pending || !linkId) return;
  pending = true;
  error = '';
  let response: Response;
  try {
    response = await fetch('/api/liens', {
      method: 'delete'.toUpperCase(),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ id: linkId }),
    });
  } catch {
    pending = false;
    error = t('share.error');
    return;
  }
  pending = false;
  if (!response.ok) {
    error = t('share.error');
    return;
  }
  link = '';
  linkId = '';
  notice = t('sites.share.revoked');
}

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    error = t('verify.copy_failed');
    return;
  }
  copied = true;
  notice = t('share.copied.long');
  setTimeout(() => {
    copied = false;
  }, 2200);
}

async function native(): Promise<void> {
  if (typeof navigator.share !== 'function') return;
  await navigator.share({ title: t('share.title'), url: link }).catch(() => {});
}

function onKey(event: KeyboardEvent): void {
  if (!open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== 'Tab' || !dialog) return;
  const list = [
    ...dialog.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input',
    ),
  ];
  const index = list.indexOf(document.activeElement as HTMLElement);
  if (event.shiftKey && index <= 0) {
    event.preventDefault();
    list[list.length - 1]?.focus();
  } else if (!event.shiftKey && index === list.length - 1) {
    event.preventDefault();
    list[0]?.focus();
  }
}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div class="sh-veil" aria-hidden="true"></div>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="sh-wrap" onclick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div class="sh-dlg" role="dialog" aria-modal="true" aria-labelledby="share-title" aria-describedby="share-lead" bind:this={dialog}>
      <button class="sh-x" type="button" aria-label={t('share.close.long')} onclick={onClose}><svg class="sh-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="sh-hd">
        <span class="sh-ic" aria-hidden="true"><svg class="sh-ico" viewBox="0 0 24 24" focusable="false"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></span>
        <div><h2 id="share-title">{t('share.title')}</h2><p id="share-lead">{t('share.lead.before')} <b>{host}</b>{t('share.lead.after')}</p></div>
      </div>
      {#if link}
        <label class="sh-lbl" for="share-url">{t('share.public')}</label>
        <div class="sh-copy">
          <input class="sh-inp" id="share-url" readonly value={link} />
          <button class="sh-btn sh-main" class:done={copied} type="button" bind:this={first} onclick={copy}><svg class="sh-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>{copied ? t('share.copied') : t('share.copy')}</span></button>
        </div>
        <div class="sh-meta"><span class="sh-pill on"><svg class="sh-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg><span>{t('share.active')}</span></span></div>
        <div class="sh-row"><button class="sh-btn" type="button" disabled={pending} onclick={revoke}>{t('sites.share.revoke')}</button></div>
        {#if canNative}
          <div class="sh-row"><button class="sh-btn sh-main" type="button" onclick={native}><svg class="sh-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg><span>{t('share.native')}</span></button></div>
        {/if}
      {:else if signedIn === false}
        <p class="sh-note">{t('share.guest')}</p>
        <div class="sh-row"><a class="sh-btn sh-main" href={signupHref(`${location.pathname}${location.search}`)} bind:this={first}>{t('share.guest.signup')}</a><a class="sh-btn sh-sub" href={loginHref(`${location.pathname}${location.search}`)}>{t('guest.gate.login')}</a></div>
      {:else}
        <p class="sh-note">{t('share.notyet')}</p>
        <div class="sh-row"><button class="sh-btn sh-main" type="button" disabled={pending} bind:this={first} onclick={create}><svg class="sh-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/></svg><span>{t('share.create')}</span></button></div>
      {/if}
      <p class="sh-st" role="status" aria-live="polite">{notice}</p>
      {#if error}<p class="sh-err" role="alert">{error}</p>{/if}
      <a class="sh-lk" href={badgeHref(auditId)}><span class="sh-lk-ico" aria-hidden="true"><svg class="sh-ico" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/></svg></span><span><b>{t('share.badge')}</b><span>{t('share.badge.hint')}</span></span><svg class="sh-ico sh-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
    </div>
  </div>
{/if}

<style>
  .sh-veil{position:fixed;inset:0;z-index:1100;background:rgba(30,42,85,.38);-webkit-backdrop-filter:blur(10px) saturate(1.05);backdrop-filter:blur(10px) saturate(1.05);animation:sh-fd .35s ease both}
  @keyframes sh-fd{from{opacity:0}}
  .sh-wrap{position:fixed;inset:0;z-index:1101;display:flex;padding:16px;overflow:auto;font-family:Inter,"Segoe UI",system-ui,sans-serif;color:var(--d-tx, #1E2A55);line-height:1.5}
  .sh-dlg{position:relative;margin:auto;width:100%;max-width:560px;background:var(--d-sf, rgba(255,255,255,.96));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--d-ln, #ADBBDA);border-radius:24px;box-shadow:0 30px 70px -24px rgba(30,42,85,.55);padding:28px;overflow:hidden;animation:sh-up .55s cubic-bezier(.16,1,.3,1) both}
  .sh-dlg::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--d-cta, #3D52A0),var(--d-cta2, #7091E6),#8697C4,var(--d-cta, #3D52A0));background-size:300% 100%;animation:sh-flow 6s linear infinite}
  @keyframes sh-up{from{opacity:0;transform:translateY(30px) scale(.98)}}
  @keyframes sh-flow{to{background-position:300% 0}}
  .sh-ico{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .sh-hd{display:flex;gap:14px;align-items:flex-start;padding-right:48px}
  .sh-ic{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--d-bg, #EDE8F5);color:var(--d-ac, #3D52A0);animation:sh-bob 3.5s ease-in-out infinite}
  .sh-ic svg{width:24px;height:24px}
  @keyframes sh-bob{50%{transform:translateY(-3px) rotate(-6deg)}}
  h2{margin:0;font-size:21px;font-weight:800;letter-spacing:-.01em;line-height:1.3}
  .sh-hd p{margin:4px 0 0;font-size:15px;color:var(--d-mu, #4A5585)}
  .sh-x{position:absolute;top:16px;right:16px;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;color:var(--d-mu, #4A5585);background:var(--d-sf, #fff);border:1px solid var(--d-ln, #ADBBDA);cursor:pointer;transition:background .2s,color .2s}
  .sh-x:hover{background:var(--d-bg, #EDE8F5);color:var(--d-tx, #1E2A55)}
  .sh-x svg{width:20px;height:20px}
  .sh-dlg :focus-visible{outline:3px solid var(--d-ac, #3D52A0);outline-offset:2px}
  .sh-lbl{display:block;font-weight:700;font-size:14px;margin:22px 0 6px}
  .sh-copy{display:flex;gap:8px}
  .sh-inp{flex:1;min-width:0;min-height:48px;padding:10px 14px;border:1px solid var(--d-ln2, #8697C4);border-radius:12px;background:var(--d-sf, #fff);font:14px/1.2 ui-monospace,Menlo,Consolas,monospace;color:var(--d-tx, #1E2A55)}
  .sh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 15px/1 Inter,system-ui,sans-serif;min-height:48px;padding:0 18px;border-radius:12px;cursor:pointer;border:1.5px solid var(--d-ac, #3D52A0);transition:background .2s,color .2s,transform .15s,box-shadow .2s}
  .sh-btn svg{width:18px;height:18px}
  .sh-btn:active{transform:scale(.97)}
  .sh-main{background:var(--d-cta, #3D52A0);color:#fff}
  a.sh-btn{text-decoration:none}
  .sh-sub{background:var(--d-sf, #fff);color:var(--d-ac, #3D52A0)}
  .sh-main:hover{background:var(--d-inv, #1E2A55);border-color:var(--d-ac, #1E2A55);box-shadow:0 8px 20px -8px rgba(61,82,160,.6)}
  .sh-main.done{background:#067647;border-color:var(--d-ok, #067647)}
  .sh-main[disabled]{opacity:.6;cursor:progress}
  .sh-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .sh-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:var(--d-bg, #EDE8F5);font-size:13px;font-weight:600;color:var(--d-mu, #4A5585)}
  .sh-pill.on{color:var(--d-ok, #067647);background:var(--d-okb, #ECFDF3)}
  .sh-pill svg{width:14px;height:14px}
  .sh-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
  .sh-note{margin:22px 0 0;font-size:15px;color:var(--d-mu, #4A5585)}
  .sh-st{margin:12px 0 0;font-size:14px;font-weight:600;color:var(--d-ok, #067647);min-height:0}
  .sh-st:empty{display:none}
  .sh-err{margin:12px 0 0;font-size:14px;font-weight:600;color:var(--d-er, #B42318)}
  .sh-lk{display:flex;align-items:center;gap:14px;margin-top:22px;min-height:44px;padding:14px 16px;border:1px solid var(--d-ln, #ADBBDA);border-radius:18px;background:var(--d-sf, #fff);color:var(--d-tx, #1E2A55);text-decoration:none;transition:transform .25s cubic-bezier(.16,1,.3,1),border-color .25s,box-shadow .25s}
  .sh-lk:hover{transform:translateY(-3px);border-color:var(--d-ic, #7091E6);box-shadow:0 16px 32px -16px rgba(61,82,160,.45)}
  .sh-lk-ico{flex:none;width:44px;height:44px;border-radius:14px;background:var(--d-bg, #EDE8F5);color:var(--d-ac, #3D52A0);display:grid;place-items:center}
  .sh-lk-ico svg{width:22px;height:22px}
  .sh-lk b{display:block}
  .sh-lk span span{display:block;font-size:14px;color:var(--d-mu, #4A5585)}
  .sh-lk>span:nth-child(2){flex:1;min-width:0}
  .sh-ar{width:20px;height:20px;color:var(--d-ac, #3D52A0);flex:none;transition:transform .25s}
  .sh-lk:hover .sh-ar{transform:translateX(4px)}
  @media(max-width:480px){.sh-dlg{padding:22px 16px}.sh-copy{flex-direction:column}.sh-row .sh-btn{flex:1 1 100%}.sh-hd{gap:10px}.sh-ic{width:38px;height:38px}h2{font-size:19px}.sh-x{top:12px;right:12px}}
  @media(prefers-reduced-motion:reduce){.sh-veil,.sh-dlg,.sh-dlg::before,.sh-ic,.sh-btn,.sh-lk,.sh-ar,.sh-x{animation:none!important;transition:none!important}}
</style>
