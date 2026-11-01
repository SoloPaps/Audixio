<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';

let name = $state('');

onMount(async () => {
  const res = await fetch('/api/auth/session', { credentials: 'include' });
  if (!res.ok) return;
  const body = (await res.json()) as { displayName?: string };
  if (typeof body.displayName === 'string') name = body.displayName.trim();
  await fetch('/api/auth/bienvenue', {
    method: 'post',
    credentials: 'include',
  });
});
</script>

{#if name}
  <p>{t('welcome.named', { name })}</p>
{/if}
