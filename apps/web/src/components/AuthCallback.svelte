<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { currentSession } from '../lib/browser-session.js';
import { takeNext } from '../lib/nav.js';

let failed = $state(false);
let armed = $state(false);

onMount(async () => {
  if (new URLSearchParams(location.search).get('retour') !== '1') return;
  armed = true;
  const session = await currentSession();
  if (!session) {
    failed = true;
    return;
  }
  location.replace(takeNext('/sites'));
});
</script>

{#if armed}
  {#if failed}
    <p role="alert">{t('callback.failed')}</p>
    <p><a class="link-action" href="/connexion">{t('callback.retry')}</a></p>
  {:else}
    <p role="status">{t('callback.working')}</p>
  {/if}
{/if}
