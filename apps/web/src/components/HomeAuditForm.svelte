<script lang="ts">
import { t } from '../i18n/slim.js';
import { createAudit, createGuestAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { saveGuestAudit } from '../lib/guest-store.js';
import { homeFormAlert } from '../lib/home-audit-notice.js';
import { progressionHref } from '../lib/relaunch.js';
import { isCompleteHttpUrl } from '../lib/site-url.js';
import GuestGate from './GuestGate.svelte';

let invalid = $state(false);
let apiMessage = $state('');
let gate = $state(false);
let busy = $state(false);

function fail(message: string): void {
  invalid = true;
  apiMessage = message;
}

async function onSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement) || busy) return;
  const raw = String(new FormData(form).get('url') ?? '').trim();
  if (!isCompleteHttpUrl(raw)) {
    invalid = true;
    apiMessage = '';
    return;
  }
  invalid = false;
  apiMessage = '';
  busy = true;
  try {
    const session = await currentSession();
    if (session) {
      const result = await createAudit(session.access_token, { url: raw });
      if (result.ok) location.assign(progressionHref(result.auditId));
      else fail(result.message);
      return;
    }
    const guest = await createGuestAudit(raw);
    if (!guest.ok) {
      if (guest.limit) gate = true;
      else fail(guest.message);
      return;
    }
    saveGuestAudit(guest.payload);
    location.assign(progressionHref(guest.payload.audit.id));
  } finally {
    busy = false;
  }
}
</script>

<form id="audit-form" class="form" novalidate onsubmit={onSubmit}>
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
        type="url"
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
  <GuestGate open={true} onClose={() => { gate = false; }} />
{/if}
