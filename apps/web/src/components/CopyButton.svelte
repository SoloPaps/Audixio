<script lang="ts">
import { t } from '../i18n/index.js';

/**
 * Bouton de copie avec retour visible (retour owner du 11 nov.) : « Copié »
 * et une coche qui se trace, puis retour au libellé. Les deux libellés
 * occupent la même case : la taille du bouton ne bouge pas. L'annonce
 * vocale reste au toast de la page (role="status").
 */
interface Props {
  label: string;
  /** Copie réelle ; `true` seulement si le texte est dans le presse-papiers. */
  run: () => Promise<boolean>;
  class?: string;
  ms?: number;
}

let { label, run, class: klass = '', ms = 2000 }: Props = $props();
let copied = $state(false);
let timer = 0;

async function onclick(): Promise<void> {
  const ok = await run();
  window.clearTimeout(timer);
  copied = ok;
  if (ok) timer = window.setTimeout(() => (copied = false), ms);
}
</script>

<button
  type="button"
  class={`${klass} copy-btn`}
  data-copied={copied ? 'true' : undefined}
  {onclick}
>
  <span class="stack">
    <span class="idle">{label}</span>
    <span class="done">
      <svg class="tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
        ><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
      >{t('mq.ui.copied')}
    </span>
  </span>
</button>

<style>
  .stack {
    display: inline-grid;
    align-items: center;
    justify-items: center;
  }
  .stack > span {
    grid-area: 1 / 1;
    display: inline-flex;
    align-items: center;
    gap: 0.45em;
  }
  .done,
  .copy-btn[data-copied] .idle {
    visibility: hidden;
  }
  .copy-btn[data-copied] .done {
    visibility: visible;
  }
  .copy-btn[data-copied] {
    box-shadow: 0 0 0 3px var(--d-okd, rgba(6, 118, 71, 0.3));
  }
  .tick {
    width: 1.15em;
    height: 1.15em;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .tick path {
    stroke-dasharray: 24;
  }
  @media (prefers-reduced-motion: no-preference) {
    .copy-btn[data-copied] .done {
      animation: copy-pop 0.24s ease-out both;
    }
    .copy-btn[data-copied] .tick path {
      animation: copy-draw 0.36s 0.08s ease-out both;
    }
  }
  @keyframes copy-pop {
    from {
      opacity: 0;
      transform: scale(0.86);
    }
  }
  @keyframes copy-draw {
    from {
      stroke-dashoffset: 24;
    }
  }
</style>
