<script lang="ts">
import { validEmail, validPassword } from '@audigy/db/auth-policy';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { bindTilt } from '../lib/motion.js';
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
let resent = $state('');
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

const meter = $derived.by(() => {
  let score = 0;
  if (password.length >= 10) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;
  const steps = [
    { max: 0, color: 'transparent', label: t('login.meter.empty') },
    { max: 25, color: '#B42318', label: t('login.meter.weak') },
    { max: 50, color: '#B54708', label: t('login.meter.fair') },
    { max: 75, color: '#7091E6', label: t('login.meter.good') },
    { max: 100, color: '#067647', label: t('login.meter.strong') },
  ];
  const step = steps.find((item) => score <= item.max) ?? steps[4];
  return {
    width: `${score}%`,
    color: step?.color ?? 'transparent',
    label:
      password && password.length < 10
        ? t('login.meter.short')
        : (step?.label ?? t('login.meter.empty')),
  };
});

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
  const card = document.querySelector('.login-card');
  const stopTilt = card instanceof HTMLElement ? bindTilt(card) : () => {};
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') location.assign('/');
  };
  document.addEventListener('keydown', onKey);
  return () => {
    stopTilt();
    document.removeEventListener('keydown', onKey);
  };
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
  resent = '';
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
  if (!error) resent = t('login.signup.sent');
  pending = false;
}

async function onSignup(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  sent = false;
  resent = '';
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

function onTabs(event: KeyboardEvent): void {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  location.assign(mode === 'login' ? '/inscription' : '/connexion');
}
</script>

{#snippet eyeIcon(off: boolean)}
  {#if off}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>
  {:else}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  {/if}
{/snippet}

{#snippet google()}
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34a853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.95H1.2v3.15C3.18 21.32 7.23 24 12 24z"/><path fill="#fbbc05" d="M5.28 14.25c-.25-.72-.38-1.5-.38-2.25s.13-1.53.38-2.25V6.6H1.2C.44 8.14 0 9.99 0 12s.44 3.86 1.2 5.4l4.08-3.15z"/><path fill="#ea4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.18 2.68 1.2 6.6l4.08 3.15c.95-2.84 3.6-4.95 6.72-4.95z"/></svg>
{/snippet}

{#snippet github()}
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1e2a55" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
{/snippet}

<main class="auth-card login-card" id="contenu" aria-labelledby="ttl">
  <a class="close" href="/" aria-label={t('login.close')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a>
  <div class="brand">
    <a href="/" aria-label={t('footer.home')}><img src="/marque/logo-pc.svg" alt="" width="107" height="34"></a>
    <h1 id="ttl">{mode === 'login' ? t('login.card.title') : t('login.signup.title')}</h1>
    <p id="sub">{sent ? t('login.verify.title') : mode === 'login' ? t('login.lead') : t('login.signup.pitch')}</p>
  </div>

  {#if !sent}
    <div class="tabs" class:is-signup={mode === 'signup'} role="navigation" aria-label={t('login.tabs')} onkeydown={onTabs}>
      <div class="tab-ind" aria-hidden="true"></div>
      <a class="tab" href="/connexion" aria-current={mode === 'login' ? 'page' : undefined}>{t('login.tab.signin')}</a>
      <a class="tab" href="/inscription" aria-current={mode === 'signup' ? 'page' : undefined}>{t('login.tab.signup')}</a>
    </div>
    <div class="social">
      <a class="sbtn" href={oauthHref('google')} aria-label={t('login.oauth.google')}>{@render google()}{t('login.brand.google')}</a>
      <a class="sbtn" href={oauthHref('github')} aria-label={t('login.oauth.github')}>{@render github()}{t('login.brand.github')}</a>
    </div>
    <div class="div">{t('login.or')}</div>
  {/if}

  {#if sent}
    <section class="center" aria-labelledby="vh">
      <div class="mailic" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></div>
      <h2 class="vh" id="vh">{t('login.verify.title')}</h2>
      <p class="vp">{t('login.verify.lead', { email: email || t('login.verify.you') })}</p>
      <p class="vp">{t('login.signup.sent')}</p>
      <a class="cta" href="/connexion" style="display:grid;place-items:center;text-decoration:none">{t('login.verify.cta')}</a>
      <p class="vp">{t('login.verify.miss')} <button type="button" class="lk" onclick={onResend}>{t('login.verify.resend')}</button></p>
      {#if resent}
        <p class="status ok" role="status">{resent}</p>
      {/if}
    </section>
  {:else if mode === 'login'}
    <form method="post" action="/api/auth/connexion" onsubmit={onLogin}>
      <input type="hidden" name="next" value={next} />
      <div class="fg">
        <label class="lbl" for="login-email">{t('login.email')}</label>
        <div class="ic">
          <input class="in" id="login-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder={t('login.email.placeholder')} required bind:value={email} aria-invalid={error ? 'true' : undefined}>
        </div>
      </div>
      <div class="fg">
        <label class="lbl" for="login-password">{t('login.password')}</label>
        <div class="ic">
          <input class="in" id="login-password" name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password" placeholder={t('login.password.placeholder')} required bind:value={password}>
          <button class="eye" type="button" aria-pressed={showPassword} aria-label={showPassword ? t('login.hide_password') : t('login.show_password')} onclick={() => { showPassword = !showPassword; }}>{@render eyeIcon(showPassword)}</button>
        </div>
      </div>
      <div class="opts">
        <label class="chk"><input type="checkbox" name="remember" bind:checked={remember}> {t('login.remember')}</label>
        <a class="lk" href="/reinitialisation">{t('login.forgot')}</a>
      </div>
      {#if error}
        <p class="status err" role="alert">{error}</p>
      {/if}
      {#if resent}
        <p class="status ok" role="status">{resent}</p>
      {/if}
      {#if expired}
        <p class="vp">{t('login.resend.lead')}</p>
        <button class="cta" type="button" disabled={pending} onclick={onResend}>{t('login.resend')}</button>
      {/if}
      <button class="cta" type="submit" disabled={pending}>{pending ? t('login.sending') : t('login.submit')}</button>
    </form>
  {:else}
    <form method="post" action="/api/auth/inscription" onsubmit={onSignup}>
      <div class="fg">
        <label class="lbl" for="signup-email">{t('login.email')}</label>
        <div class="ic">
          <input class="in" id="signup-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder={t('login.email.placeholder')} required bind:value={email}>
        </div>
      </div>
      <div class="fg">
        <label class="lbl" for="signup-password">{t('login.password')}</label>
        <div class="ic">
          <input class="in" id="signup-password" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password" placeholder={t('login.signup.password.placeholder')} minlength="10" required bind:value={password} aria-describedby="mt">
          <button class="eye" type="button" aria-pressed={showPassword} aria-label={showPassword ? t('login.hide_password') : t('login.show_password')} onclick={() => { showPassword = !showPassword; }}>{@render eyeIcon(showPassword)}</button>
        </div>
        <div class="meter" aria-hidden="true"><div class="bar" style:width={meter.width} style:background-color={meter.color}></div></div>
        <p class="mtxt" id="mt" aria-live="polite">{meter.label}</p>
      </div>
      <div class="opts">
        <label class="chk">
          <input type="checkbox" name="terms" value="on" bind:checked={terms} required>
          <span>{t('login.signup.accept')} <a class="lk" href="/cgu">{t('footer.cgu')}</a> {t('login.signup.and')} <a class="lk" href="/confidentialite">{t('login.signup.privacy')}</a>.</span>
        </label>
      </div>
      {#if error}
        <p class="status err" role="alert">{error}</p>
      {/if}
      <button class="cta" type="submit" disabled={pending}>{pending ? t('login.signup.sending') : t('login.signup.submit')}</button>
    </form>
  {/if}

  <p class="legal"><a href="/">{t('nav.home')}</a> · <a href="/cgu">{t('footer.cgu')}</a> · <a href="/confidentialite">{t('footer.privacy')}</a><br>{t('login.legal')}</p>
</main>
