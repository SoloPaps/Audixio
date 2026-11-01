<script lang="ts">
import { validEmail, validPassword } from '@audigy/db/auth-policy';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { rememberNext, safeNext } from '../lib/nav.js';
import { authConfigured } from '../lib/public-config.js';

interface Props {
  mode: 'login' | 'signup';
}

let { mode }: Props = $props();

let email = $state('');
let password = $state('');
let showPassword = $state(false);
let remember = $state(false);
let terms = $state(false);
let error = $state('');
let sent = $state(false);
let pending = $state(false);
let expired = $state(false);
let next = $state('/sites');
const configured = authConfigured();

const messages: Record<string, string> = {
  identifiants: t('login.invalid_credentials'),
  email: t('login.invalid_email'),
  mot: t('login.invalid_password'),
  conditions: t('login.signup.terms_required'),
  debit: t('login.rate'),
  oauth: t('login.oauth_error'),
  lien: t('login.link_error'),
  indisponible: t('login.unconfigured'),
  invalid_credentials: t('login.invalid_credentials'),
  invalid_email: t('login.invalid_email'),
  invalid_password: t('login.invalid_password'),
  terms_required: t('login.signup.terms_required'),
  rate_limited: t('login.rate'),
  unavailable: t('login.unconfigured'),
  oauth_error: t('login.oauth_error'),
  link: t('login.link_error'),
};

onMount(() => {
  const params = new URLSearchParams(location.search);
  next = safeNext(params.get('next'), '/sites');
  rememberNext(next);
  const code = params.get('erreur');
  if (code && messages[code]) error = messages[code];
  if (code === 'lien' || code === 'link') expired = true;
  if (params.get('envoye') === '1') sent = true;
  const oauth = params.get('oauth');
  if ((oauth === 'google' || oauth === 'github') && !code) {
    const target = new URLSearchParams({ provider: oauth, next });
    location.assign(`/api/auth/oauth?${target.toString()}`);
  }
});

function oauthHref(provider: 'google' | 'github'): string {
  const params = new URLSearchParams({ oauth: provider, next });
  const base = mode === 'signup' ? '/inscription' : '/connexion';
  return `${base}?${params.toString()}`;
}

async function post(
  path: string,
  fields: Record<string, string>,
): Promise<void> {
  const body = new URLSearchParams(fields);
  const res = await fetch(path, {
    method: 'post',
    headers: { accept: 'application/json' },
    body,
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

async function onLogin(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  if (!configured) {
    error = t('login.unconfigured');
    return;
  }
  if (pending) return;
  pending = true;
  const fields: Record<string, string> = {
    email,
    password,
    next,
  };
  if (remember) fields.remember = 'on';
  await post('/api/auth/connexion', fields);
  pending = false;
}

async function onResend(): Promise<void> {
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
  await post('/api/auth/renvoi', { email });
  if (!error) sent = true;
  pending = false;
}

async function onSignup(event: SubmitEvent): Promise<void> {
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
  if (!validPassword(password)) {
    error = t('login.invalid_password');
    return;
  }
  if (!terms) {
    error = t('login.signup.terms_required');
    return;
  }
  if (pending) return;
  pending = true;
  await post('/api/auth/inscription', { email, password, terms: 'on', next });
  if (!error) sent = true;
  pending = false;
}
</script>

<div class="login-card glass">
  <div class="glass-plate auth-plate">
    <p class="page-links">
      <a class="link-inline" href="/">{t('login.close')}</a>
    </p>
    <h1>{mode === 'login' ? t('login.card.title') : t('login.signup.title')}</h1>
    <p class="prose">
      {mode === 'login' ? t('login.lead') : t('login.signup.lead')}
    </p>
    <div class="auth-tabs" role="navigation" aria-label={t('login.tabs')}>
      <a
        class="button"
        class:button-primary={mode === 'login'}
        class:button-bordered={mode !== 'login'}
        href="/connexion"
        aria-current={mode === 'login' ? 'page' : undefined}
      >{t('login.tab.signin')}</a>
      <a
        class="button"
        class:button-primary={mode === 'signup'}
        class:button-bordered={mode !== 'signup'}
        href="/inscription"
        aria-current={mode === 'signup' ? 'page' : undefined}
      >{t('login.tab.signup')}</a>
    </div>
    <div class="auth-social">
      <a class="button button-bordered" href={oauthHref('google')}>{t('login.oauth.google')}</a>
      <a class="button button-bordered" href={oauthHref('github')}>{t('login.oauth.github')}</a>
    </div>
    <p class="auth-or">{t('login.or')}</p>
    {#if sent}
      <p role="status">{t('login.signup.sent')}</p>
    {:else if mode === 'login'}
      <form class="audit-form" method="post" action="/api/auth/connexion" onsubmit={onLogin}>
        <input type="hidden" name="next" value={next} />
        <div class="field">
          <label for="login-email">{t('login.email')}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autocomplete="email"
            inputmode="email"
            required
            bind:value={email}
            aria-invalid={error ? 'true' : undefined}
          />
        </div>
        <div class="field">
          <label for="login-password">{t('login.password')}</label>
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autocomplete="current-password"
            required
            bind:value={password}
          />
          <button
            class="button button-link"
            type="button"
            aria-pressed={showPassword}
            onclick={() => { showPassword = !showPassword; }}
          >{showPassword ? t('login.hide_password') : t('login.show_password')}</button>
        </div>
        <p class="page-links">
          <label>
            <input type="checkbox" name="remember" bind:checked={remember} />
            {t('login.remember')}
          </label>
          <a class="link-inline" href="/reinitialisation">{t('login.forgot')}</a>
        </p>
        {#if error}
          <p class="form-error" role="alert">{error}</p>
        {/if}
        {#if expired}
          <p>{t('login.resend.lead')}</p>
          <button
            class="button button-secondary"
            type="button"
            disabled={pending}
            onclick={onResend}
          >
            {t('login.resend')}
          </button>
        {/if}
        <button class="button button-primary" type="submit" disabled={pending}>
          {pending ? t('login.sending') : t('login.submit')}
        </button>
      </form>
    {:else}
      <form class="audit-form" method="post" action="/api/auth/inscription" onsubmit={onSignup}>
        <div class="field">
          <label for="signup-email">{t('login.email')}</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autocomplete="email"
            inputmode="email"
            required
            bind:value={email}
          />
        </div>
        <div class="field">
          <label for="signup-password">{t('login.password')}</label>
          <input
            id="signup-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autocomplete="new-password"
            minlength="10"
            required
            bind:value={password}
            aria-describedby="signup-hint"
          />
          <p id="signup-hint">{t('login.signup.password_hint')}</p>
          <button
            class="button button-link"
            type="button"
            aria-pressed={showPassword}
            onclick={() => { showPassword = !showPassword; }}
          >{showPassword ? t('login.hide_password') : t('login.show_password')}</button>
        </div>
        <p>
          <label>
            <input type="checkbox" name="terms" value="on" bind:checked={terms} required />
            {t('login.signup.terms')}
            <a class="link-inline" href="/cgu">{t('footer.terms')}</a>
            <a class="link-inline" href="/confidentialite">{t('footer.privacy')}</a>
          </label>
        </p>
        {#if error}
          <p class="form-error" role="alert">{error}</p>
        {/if}
        <button class="button button-primary" type="submit" disabled={pending}>
          {pending ? t('login.signup.sending') : t('login.signup.submit')}
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .auth-plate { display: flex; flex-direction: column; gap: var(--space-4); }
  .auth-tabs, .auth-social { display: flex; gap: var(--space-3); }
  .auth-tabs a, .auth-social a { flex: 1; }
  .auth-or { margin: 0; color: var(--ink-2); font-size: var(--text-sm); }
</style>
