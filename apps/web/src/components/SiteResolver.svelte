<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { parseSiteRoute, siteHref } from '../lib/site-route.js';
import SessionWall from './SessionWall.svelte';

/**
 * `/sites/id/:site` : ancien lien à identifiant (R11, R12, alertes).
 * Le site est lu dans le compte connecté, puis l’adresse est remplacée par
 * `/sites/:host` en gardant la requête et l’ancre (STRUCTURE.md §8). Aucun site étranger.
 */
let mode = $state<'pending' | 'out'>('pending');

onMount(() => {
  void (async () => {
    const route = parseSiteRoute(location.pathname);
    if (route.kind !== 'id') {
      location.replace('/sites');
      return;
    }
    const session = await currentSession();
    const supabase = browserClient();
    if (!session || !supabase) {
      mode = 'out';
      return;
    }
    const { data } = await supabase
      .from('sites')
      .select('host')
      .eq('id', route.id)
      .eq('owner_id', session.user.id)
      .is('deleted_at', null)
      .maybeSingle();
    const host = typeof data?.host === 'string' ? data.host : '';
    if (!host) {
      // Un site inconnu ou d’un autre compte ne révèle rien.
      location.replace('/sites');
      return;
    }
    // Deux sites du compte sur le même hôte (portée par chemin) : l’identifiant
    // reste dans la requête pour ouvrir le bon.
    const { data: twins } = await supabase
      .from('sites')
      .select('id')
      .eq('owner_id', session.user.id)
      .eq('host', host)
      .is('deleted_at', null);
    const params = new URLSearchParams(location.search);
    if (Array.isArray(twins) && twins.length > 1) params.set('site', route.id);
    const query = params.toString();
    // Requête (thème, langue) et ancre gardées.
    location.replace(
      `${siteHref(host)}${query ? `?${query}` : ''}${location.hash}`,
    );
  })();
});
</script>

<main id="contenu" class="st" tabindex="-1">
  {#if mode === 'out'}
    <div class="st-wrap"><SessionWall title={t('st.need_login')} next={`${location.pathname}${location.hash}`} /></div>
  {:else}
    <p class="st-wait" role="status">{t('st.resolve')}</p>
  {/if}
</main>
