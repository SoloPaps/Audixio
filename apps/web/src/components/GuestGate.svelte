<script lang="ts">
import { onMount, tick } from 'svelte';
import { t } from '../i18n/index.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

let { open, onClose }: Props = $props();

let dialog = $state<HTMLElement | null>(null);
let previous: HTMLElement | null = null;

function controls(): HTMLElement[] {
  if (!dialog) return [];
  return [
    ...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'),
  ];
}

function onKey(event: KeyboardEvent): void {
  if (!open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== 'Tab') return;
  const list = controls();
  if (list.length === 0) return;
  const index = list.indexOf(document.activeElement as HTMLElement);
  if (event.shiftKey) {
    if (index <= 0) {
      event.preventDefault();
      list[list.length - 1]?.focus();
    }
    return;
  }
  if (index === -1 || index === list.length - 1) {
    event.preventDefault();
    list[0]?.focus();
  }
}

onMount(() => {
  const node = dialog;
  previous = document.activeElement as HTMLElement | null;
  void tick().then(() => node?.focus());
  return () => {
    previous?.focus();
  };
});
</script>

<svelte:window onkeydown={onKey} />

<div class="gg-veil"></div>
<div class="gg-wrap">
  <div
    class="gg"
    role="dialog"
    aria-modal="true"
    aria-labelledby="gg-title"
    aria-describedby="gg-lead"
    tabindex="-1"
    bind:this={dialog}
  >
    <p class="gg-pill-k">{t('guest.gate.kicker')}</p>
    <h2 id="gg-title">{t('guest.gate.title')}</h2>
    <p id="gg-lead">{t('guest.gate.lead')}</p>
    <div class="gg-actions">
      <a class="gg-btn" href="/connexion">{t('guest.gate.login')}</a>
      <a class="gg-btn gg-btn-main" href="/inscription">{t('guest.gate.signup')}</a>
    </div>
    <button class="gg-close" type="button" onclick={onClose}>{t('guest.gate.close')}</button>
  </div>
</div>

<style>
  .gg-veil {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgb(27 31 36 / 0.46);
  }
  .gg-wrap {
    position: fixed;
    inset: 0;
    z-index: 81;
    display: grid;
    place-items: center;
    padding: 12px;
  }
  .gg {
    box-sizing: border-box;
    width: min(26rem, 100%);
    max-height: calc(100vh - 24px);
    overflow: auto;
    margin: 0;
    padding: 1.25rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-float);
    font-family: Inter, "Segoe UI", system-ui, sans-serif;
  }
  .gg:focus {
    outline: 2px solid var(--focus);
    outline-offset: 3px;
  }
  .gg-pill-k {
    display: inline-flex;
    align-items: center;
    margin: 0 0 0.75rem;
    padding: 0.2rem 0.7rem;
    border-radius: var(--radius-pill);
    background: var(--score-good-bg);
    color: var(--score-good);
    font-size: var(--text-xs);
    font-weight: 650;
  }
  h2 {
    margin: 0;
    font-size: var(--text-xl);
    line-height: 1.25;
    font-weight: 650;
  }
  #gg-lead {
    margin: 0.75rem 0 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
    line-height: var(--leading-body);
  }
  .gg-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1.25rem;
  }
  .gg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--touch-min);
    padding: 0 1rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-weight: 650;
    text-decoration: none;
  }
  .gg-btn-main {
    border-color: transparent;
    background: var(--accent);
    color: var(--on-accent);
  }
  .gg-btn:focus-visible,
  .gg-close:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 3px;
  }
  .gg-close {
    display: inline-flex;
    margin-top: 0.75rem;
    min-height: var(--touch-min);
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  @media (max-width: 360px) {
    .gg-wrap {
      padding: 8px;
    }
    .gg {
      width: 100%;
      padding: 1rem;
    }
    .gg-actions {
      flex-direction: column;
    }
    .gg-btn {
      width: 100%;
    }
  }
</style>
