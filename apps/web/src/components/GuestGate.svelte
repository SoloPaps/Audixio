<script lang="ts">
import { onMount, tick } from 'svelte';
import { t } from '../i18n/index.js';
import '../styles/maquettes/guest-gate.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

let { open, onClose }: Props = $props();

let dialog = $state<HTMLElement | null>(null);
let previous: HTMLElement | null = null;

function portal(node: HTMLElement): { destroy: () => void } {
  document.body.append(node);
  return {
    destroy() {
      node.remove();
    },
  };
}

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
  const root = document.documentElement;
  root.classList.add('gg-lock');
  const node = dialog;
  previous = document.activeElement as HTMLElement | null;
  void tick().then(() => node?.focus());
  return () => {
    root.classList.remove('gg-lock');
    previous?.focus();
  };
});
</script>

<svelte:window onkeydown={onKey} />

<div class="gg-root" use:portal>
  <div class="gg-veil"></div>
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
    <p class="gg-lead" id="gg-lead">{t('guest.gate.lead')}</p>
    <div class="gg-actions">
      <a class="gg-btn" href="/connexion">{t('guest.gate.login')}</a>
      <a class="gg-btn gg-btn-main" href="/inscription">{t('guest.gate.signup')}</a>
    </div>
    <button class="gg-close" type="button" onclick={onClose}>{t('guest.gate.close')}</button>
  </div>
</div>
