<script lang="ts">
import { validEmail, validPassword } from '@audigy/db/auth-policy';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { say } from '../lib/motion.js';
import { authConfigured } from '../lib/public-config.js';

interface Props {
  renew?: boolean;
}

let { renew: startRenew = false }: Props = $props();
let renew = $state(startRenew);

let email = $state('');
let password = $state('');
let confirm = $state('');
let showPassword = $state(false);
let showConfirm = $state(false);
let error = $state('');
let sent = $state(false);
let pending = $state(false);
const configured = authConfigured();

const messages: Record<string, string> = {
  email: t('login.invalid_email'),
  mot: t('login.invalid_password'),
  different: t('login.signup.mismatch'),
  debit: t('login.rate'),
  lien: t('login.link_error'),
  indisponible: t('login.unconfigured'),
  invalid_email: t('login.invalid_email'),
  invalid_password: t('login.invalid_password'),
  mismatch: t('login.signup.mismatch'),
  rate_limited: t('login.rate'),
  link: t('login.link_error'),
  unavailable: t('login.unconfigured'),
};

const strength = $derived.by(() => {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[^\w]/.test(password) || password.length >= 16) score += 1;
  return password ? String(Math.max(1, score)) : '0';
});

onMount(() => {
  const params = new URLSearchParams(location.search);
  renew = params.get('etape') === 'nouveau';
  const code = params.get('erreur');
  if (code && messages[code]) error = messages[code];
  if (params.get('envoye') === '1') sent = true;
});

async function post(
  path: string,
  fields: Record<string, string>,
): Promise<void> {
  const res = await fetch(path, {
    method: 'post',
    headers: { accept: 'application/json' },
    body: new URLSearchParams(fields),
    credentials: 'include',
  });
  const payload = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    redirect?: string;
  } | null;
  if (!res.ok || !payload?.ok) {
    error = messages[payload?.error ?? ''] ?? t('login.unconfigured');
    return;
  }
  if (payload.redirect) location.assign(payload.redirect);
}

async function onAsk(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  sent = false;
  if (!configured) {
    error = t('login.unconfigured');
    return;
  }
  if (!validEmail(email)) {
    error = t('login.invalid_email');
    return;
  }
  if (pending) return;
  pending = true;
  await post('/api/auth/reinitialisation', { email });
  if (!error) sent = true;
  pending = false;
}

async function onSave(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  if (!validPassword(password)) {
    error = t('login.invalid_password');
    say(t('login.invalid_password'));
    return;
  }
  if (password !== confirm) {
    error = t('login.signup.mismatch');
    return;
  }
  if (pending) return;
  pending = true;
  await post('/api/auth/mot-de-passe', {
    password,
    password_confirm: confirm,
  });
  pending = false;
}
</script>

{#snippet eye(off: boolean)}
  {#if off}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4.2"/><path d="M6.1 6.1C3.5 7.8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.2-.9"/></svg>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
  {/if}
{/snippet}

{#snippet arrow(kind: 'btn' | 'link')}
  <svg class={kind === 'link' ? 'lk-ar' : undefined} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
{/snippet}

<nav class="crumbs fade" aria-label={t('auth.crumbs')}>
  <ol>
    <li><a href="/">{t('nav.home')}</a></li>
    <li><a href="/connexion">{t('login.card.title')}</a></li>
    <li aria-current="page">{t('reset.crumb')}</li>
  </ol>
</nav>

<section class="hero" aria-labelledby="t">
  {#if renew}
    <div class="badge-ic" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
    <h1 id="t" class="h1like fade" style="--d:.1s">{t('reset.new.before')} <span class="grad">{t('reset.new.em')}</span></h1>
    <p class="lead fade" style="--d:.2s">{t('reset.new.lead')} {t('reset.new.note')}</p>
    <div class="panel narrow fade" style="--d:.3s">
      <form method="post" action="/api/auth/mot-de-passe" onsubmit={onSave}>
        <div class="field" style="margin-top:0">
          <label for="new-password">{t('reset.new.password')}</label>
          <div class="pw">
            <input class="inp" id="new-password" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password" minlength="10" required bind:value={password} aria-describedby="p1-h" aria-invalid={error ? 'true' : undefined}>
            <button type="button" aria-pressed={showPassword} aria-label={showPassword ? t('login.hide_password') : t('login.show_password')} onclick={() => { showPassword = !showPassword; }}>{@render eye(showPassword)}</button>
          </div>
          <div class="bars" data-s={strength} aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <span class="hint" id="p1-h">{t('reset.new.lead')}</span>
        </div>
        <div class="field">
          <label for="confirm-password">{t('reset.new.confirm')}</label>
          <div class="pw">
            <input class="inp" id="confirm-password" name="password_confirm" type={showConfirm ? 'text' : 'password'} autocomplete="new-password" minlength="10" required bind:value={confirm}>
            <button type="button" aria-pressed={showConfirm} aria-label={showConfirm ? t('login.hide_password') : t('login.show_password')} onclick={() => { showConfirm = !showConfirm; }}>{@render eye(showConfirm)}</button>
          </div>
        </div>
        {#if error}
          <p class="err-msg" role="alert">{error}</p>
        {/if}
        <button class="btn btn-primary wide" type="submit" disabled={pending}>{t('reset.new.submit')} {@render arrow('btn')}</button>
      </form>
    </div>
  {:else}
    <div class="badge-ic" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></div>
    <h1 id="t" class="fade" style="--d:.1s">{t('reset.before')} <span class="grad">{t('reset.em')}</span></h1>
    <p class="lead fade" style="--d:.2s">{t('reset.lead')}</p>
    <div class="panel narrow fade" style="--d:.3s">
      <form method="post" action="/api/auth/reinitialisation" onsubmit={onAsk}>
        <div class="field" style="margin-top:0">
          <label for="reset-email">{t('login.email')}</label>
          <input class="inp" id="reset-email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder={t('login.email.placeholder')} bind:value={email} aria-invalid={error ? 'true' : undefined}>
          {#if error}
            <span class="err-msg" role="alert">{error}</span>
          {/if}
        </div>
        <button class="btn btn-primary wide" type="submit" disabled={pending}>{pending ? t('reset.sending') : t('reset.submit')} {@render arrow('btn')}</button>
      </form>
      {#if sent}
        <div class="note" role="status"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg><span><b>{t('reset.sent.for', { email })}</b> {t('reset.sent')}</span></div>
      {/if}
    </div>
  {/if}
</section>

<section class="sec" aria-labelledby="h-aide">
  <h2 id="h-aide">{t('reset.help.title')}</h2>
  <ul class="lk-grid">
    <li><a class="lk" href="/connexion"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span><span class="lk-tx"><span class="lk-t">{t('reset.back')}</span><span class="lk-d">{t('reset.help.login.hint')}</span></span>{@render arrow('link')}</a></li>
    <li><a class="lk" href="/compte"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span><span class="lk-tx"><span class="lk-t">{t('reset.help.mail')}</span><span class="lk-d">{t('reset.help.mail.hint')}</span></span>{@render arrow('link')}</a></li>
    <li><a class="lk" href="/confidentialite"><span class="lk-ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg></span><span class="lk-tx"><span class="lk-t">{t('reset.help.safe')}</span><span class="lk-d">{t('reset.help.safe.hint')}</span></span>{@render arrow('link')}</a></li>
  </ul>
</section>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
