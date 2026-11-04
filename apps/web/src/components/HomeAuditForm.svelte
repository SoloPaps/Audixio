<script lang="ts">
import { t } from '../i18n/slim.js';
import { saveGuestAudit } from '../lib/guest-store.js';
import { launchFromHome } from '../lib/home-audit-client.js';
import { t as gateText } from '../lib/home-audit-copy.js';
import { homeFormAlert } from '../lib/home-audit-notice.js';
import { homeUrlIssue } from '../lib/home-url-issue.js';
import { progressionHref } from '../lib/relaunch.js';
import '../styles/maquettes/guest-gate.css';

let formEl = $state<HTMLFormElement | null>(null);
let invalid = $state(false);
let apiMessage = $state('');
let gate = $state(false);
let busy = $state(false);

function fail(message: string): void {
  invalid = true;
  apiMessage = message;
}

$effect(() => {
  if (!gate) return;
  document.documentElement.classList.add('gg-lock');
  return () => {
    document.documentElement.classList.remove('gg-lock');
  };
});

async function onSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = formEl;
  if (!form || busy) return;
  const raw = String(new FormData(form).get('url') ?? '').trim();
  if (homeUrlIssue(raw, t('home.url.error'))) {
    invalid = true;
    apiMessage = '';
    return;
  }
  invalid = false;
  apiMessage = '';
  busy = true;
  try {
    const result = await launchFromHome(raw);
    if (!result.ok) {
      if (result.limit) gate = true;
      else fail(result.message);
      return;
    }
    if (result.guest) saveGuestAudit(result.guest);
    location.assign(progressionHref(result.auditId));
  } finally {
    busy = false;
  }
}
</script>

<form id="audit-form" class="form" novalidate bind:this={formEl} onsubmit={onSubmit}>
  <label for="url-input">
    <span>{t('home.url.long')}</span>
    <kbd class="kbd">URL</kbd>
  </label>
  <div class="field" id="audit-field">
    <div class="input-wrap">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
      <input
        class="input"
        id="url-input"
        name="url"
        type="text"
        inputmode="url"
        autocomplete="url"
        autocapitalize="off"
        spellcheck="false"
        required
        maxlength="2048"
        placeholder={t('home.url.example')}
        aria-describedby={invalid ? 'url-error' : 'url-hint'}
        aria-invalid={invalid ? 'true' : undefined}
      />
    </div>
    <button class="btn btn-primary" id="audit-btn" type="submit">
      <span>{t('home.submit.free')}</span>
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  </div>
  <p class="error" id="url-error" role="alert">{homeFormAlert({
    invalidUrl: invalid,
    apiMessage,
    urlError: t('home.url.error'),
  })}</p>
  <p class="hint" id="url-hint">{t('home.url.format')}</p>
</form>
<p><a class="link-inline" href="/methode">{t('home.method')}</a></p>
{#if gate}
  <div class="gg-root">
    <div class="gg-veil"></div>
    <div class="gg" role="dialog" aria-modal="true" aria-labelledby="gg-title" aria-describedby="gg-lead" tabindex="-1">
      <p class="gg-pill-k">{gateText('guest.gate.kicker')}</p>
      <h2 id="gg-title">{gateText('guest.gate.title')}</h2>
      <p class="gg-lead" id="gg-lead">{gateText('guest.gate.lead')}</p>
      <div class="gg-actions">
        <a class="gg-btn" href="/connexion">{gateText('guest.gate.login')}</a>
        <a class="gg-btn gg-btn-main" href="/inscription">{gateText('guest.gate.signup')}</a>
      </div>
      <button class="gg-close" type="button" onclick={() => { gate = false; }}>{gateText('guest.gate.close')}</button>
    </div>
  </div>
{/if}
