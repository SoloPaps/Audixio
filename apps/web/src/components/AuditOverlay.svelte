<script lang="ts">
import { t } from '../i18n/index.js';

interface Props {
  message: string;
  phase?: string | null;
  eta?: string | null;
  plain?: boolean;
  /**
   * Chargement neutre (avant de savoir où en est l’audit) : pas de disque ni
   * de lien « Revenir à l’accueil », zone marquée occupée (aria-busy).
   */
  neutral?: boolean;
}

let {
  message,
  phase = null,
  eta = null,
  plain = false,
  neutral = false,
}: Props = $props();
</script>

{#snippet body()}
  <p role="status" aria-live="polite">{message}</p>
  {#if phase}
    <p>{phase}</p>
  {/if}
  {#if eta}
    <p>{eta}</p>
  {/if}
  {#if !neutral}<div class="disk"></div>{/if}
  <div class="bar" aria-hidden="true"></div>
  <div class="bar" aria-hidden="true"></div>
  <div class="bar" aria-hidden="true"></div>
  {#if !neutral}<p><a class="link-action" href="/">{t('progress.home')}</a></p>{/if}
{/snippet}

{#if plain}
  <div class="overlay" aria-busy={neutral ? 'true' : undefined}>
    {@render body()}
  </div>
{:else}
  <div class="overlay glass" aria-busy={neutral ? 'true' : undefined}>
    <div class="glass-plate">
      {@render body()}
    </div>
  </div>
{/if}

<style>
  .disk,
  .bar {
    background: var(--line);
    border-radius: var(--radius-sm);
  }

  .disk {
    width: var(--gauge-hero);
    height: var(--gauge-hero);
    border-radius: 50%;
  }

  .bar {
    height: var(--space-4);
    margin-top: var(--space-3);
  }

  @media (prefers-reduced-motion: no-preference) {
    .bar { animation: pulse 1s linear infinite alternate; }
  }

  @keyframes pulse {
    from { opacity: 0.45; }
    to { opacity: 1; }
  }
</style>
