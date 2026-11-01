<script lang="ts">
import { validEmail, validPassword } from '@audigy/db/auth-policy';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { authConfigured } from '../lib/public-config.js';

let email = $state('');
let password = $state('');
let confirm = $state('');
let showPassword = $state(false);
let error = $state('');
let sent = $state(false);
let pending = $state(false);
let renew = $state(false);
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

<div class="login-card glass">
  <div class="glass-plate auth-plate">
    <p><a class="link-inline" href="/connexion">{t('reset.back')}</a></p>
    {#if renew}
      <h1>{t('reset.new.title')}</h1>
      <p class="prose">{t('reset.new.lead')}</p>
      <form class="audit-form" method="post" action="/api/auth/mot-de-passe" onsubmit={onSave}>
        <div class="field">
          <label for="new-password">{t('reset.new.password')}</label>
          <input
            id="new-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autocomplete="new-password"
            minlength="10"
            required
            bind:value={password}
          />
        </div>
        <div class="field">
          <label for="confirm-password">{t('reset.new.confirm')}</label>
          <input
            id="confirm-password"
            name="password_confirm"
            type={showPassword ? 'text' : 'password'}
            autocomplete="new-password"
            minlength="10"
            required
            bind:value={confirm}
          />
          <button
            class="button button-link"
            type="button"
            aria-pressed={showPassword}
            onclick={() => { showPassword = !showPassword; }}
          >{showPassword ? t('login.hide_password') : t('login.show_password')}</button>
        </div>
        {#if error}
          <p class="form-error" role="alert">{error}</p>
        {/if}
        <button class="button button-primary" type="submit" disabled={pending}>
          {t('reset.new.submit')}
        </button>
      </form>
    {:else}
      <h1>{t('reset.title')}</h1>
      <p class="prose">{t('reset.lead')}</p>
      {#if sent}
        <p role="status">{t('reset.sent')}</p>
      {:else}
        <form class="audit-form" method="post" action="/api/auth/reinitialisation" onsubmit={onAsk}>
          <div class="field">
            <label for="reset-email">{t('login.email')}</label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              required
              bind:value={email}
            />
          </div>
          {#if error}
            <p class="form-error" role="alert">{error}</p>
          {/if}
          <button class="button button-primary" type="submit" disabled={pending}>
            {pending ? t('reset.sending') : t('reset.submit')}
          </button>
        </form>
      {/if}
    {/if}
  </div>
</div>

<style>
  .auth-plate { display: flex; flex-direction: column; gap: var(--space-4); }
</style>
