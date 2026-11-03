<script lang="ts">
import { t } from '../i18n/slim.js';
import { normalizeSiteUrl } from '../lib/site-url.js';

let invalid = $state(false);

function onSubmit(event: SubmitEvent): void {
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const raw = String(new FormData(form).get('url') ?? '').trim();
  try {
    normalizeSiteUrl(raw);
    invalid = false;
  } catch {
    event.preventDefault();
    invalid = true;
  }
}
</script>

<form id="audit-form" class="form" action="/progression" method="get" novalidate onsubmit={onSubmit}>
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
  <p class="error" id="url-error" role="alert">{invalid ? t('home.url.error') : ''}</p>
  <p class="hint" id="url-hint">{t('home.url.format')}</p>
</form>
<p><a class="link-inline" href="/methode">{t('home.method')}</a></p>
