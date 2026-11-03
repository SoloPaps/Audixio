<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { createAudit, createGuestAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { saveGuestAudit } from '../lib/guest-store.js';
import { progressionHref } from '../lib/relaunch.js';
import { InvalidSiteUrl, normalizeSiteUrl } from '../lib/site-url.js';
import GuestGate from './GuestGate.svelte';

let message = $state(t('launch.working'));
let failed = $state(false);
let gate = $state(false);

onMount(async () => {
  const params = new URLSearchParams(location.search);
  const url = params.get('url');
  const siteId = params.get('site');
  if (!url && !siteId) {
    message = t('launch.missing');
    failed = true;
    return;
  }
  if (url && !siteId) {
    try {
      normalizeSiteUrl(url, {
        allowLab: import.meta.env.PUBLIC_AUDIGY_LAB === '1',
      });
    } catch (error) {
      if (error instanceof InvalidSiteUrl) {
        message = t('api.error.invalid_url');
        failed = true;
        return;
      }
      throw error;
    }
  }
  const session = await currentSession();
  if (!session) {
    if (!url) {
      gate = true;
      failed = true;
      message = t('guest.gate.title');
      return;
    }
    const guest = await createGuestAudit(url);
    if (!guest.ok) {
      if (guest.limit) {
        gate = true;
        failed = true;
        message = t('guest.gate.title');
        return;
      }
      message = guest.message;
      failed = true;
      return;
    }
    saveGuestAudit(guest.payload);
    location.replace(progressionHref(guest.payload.audit.id));
    return;
  }
  const result = await createAudit(
    session.access_token,
    siteId ? { siteId } : { url: url ?? '' },
  );
  if (!result.ok) {
    message = result.message;
    failed = true;
    return;
  }
  location.replace(progressionHref(result.auditId));
});
</script>

<p role="status" aria-live="polite">{message}</p>
{#if failed && !gate}
  <p class="page-links">
    <a class="link-action" href="/">{t('launch.back')}</a>
    <a class="link-action" href="/sites">{t('nav.sites')}</a>
  </p>
{/if}
{#if gate}
  <GuestGate open={true} onClose={() => { gate = false; }} />
{/if}
