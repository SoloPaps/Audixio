<script lang="ts">
import { t } from '../i18n/slim.js';
import { saveGuestAudit } from '../lib/guest-store.js';
import { launchFromHome } from '../lib/home-audit-client.js';
import { t as gateText } from '../lib/home-audit-copy.js';
import { homeFormAlert } from '../lib/home-audit-notice.js';
import { homeUrlIssue, withScheme } from '../lib/home-url-issue.js';
import { progressionHref } from '../lib/relaunch.js';
import '../styles/maquettes/guest-gate.css';

interface Props {
  /** Formulaire du héros : porte les ancres #audit-form et #url-input. */
  primary?: boolean;
  label: string;
  submit: string;
  hint: string;
}

let { primary = true, label, submit, hint }: Props = $props();
const suffix = primary ? '' : '-fin';

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
  const raw = withScheme(String(new FormData(form).get('url') ?? ''));
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

<form id={primary ? 'audit-form' : undefined} class="audit" novalidate bind:this={formEl} onsubmit={onSubmit}>
  <label class="sr" for={`url-input${suffix}`}>{label}</label>
  <div class="field">
    <div class="inp">
      <span aria-hidden="true">https://</span>
      <input
        id={`url-input${suffix}`}
        name="url"
        type="text"
        inputmode="url"
        autocomplete="url"
        autocapitalize="off"
        spellcheck="false"
        required
        maxlength="2048"
        placeholder="monsite.fr"
        aria-describedby={invalid ? `url-error${suffix}` : `url-hint${suffix}`}
        aria-invalid={invalid ? 'true' : undefined}
      />
    </div>
    <button class="btn" id={primary ? 'audit-btn' : undefined} type="submit" aria-busy={busy ? 'true' : undefined}>
      {submit}<svg aria-hidden="true"><use href="#i-arrow" /></svg>
    </button>
  </div>
  <p class="err" id={`url-error${suffix}`} role="alert">{homeFormAlert({
    invalidUrl: invalid,
    apiMessage,
    urlError: t('home.url.error'),
  })}</p>
  <p class="sr" id={`url-hint${suffix}`}>{hint}</p>
</form>
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
