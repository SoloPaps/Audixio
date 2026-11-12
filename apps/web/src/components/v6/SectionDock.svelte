<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../../i18n/index.js';
import { dockState } from '../../lib/v6-dock.js';

interface Section {
  id: string;
  label: string;
}

interface Props {
  sections: Section[];
}

let { sections }: Props = $props();
let active = $state(0);
let on = $state(false);
let open = $state(false);
let root: HTMLElement | undefined = $state();

const count = $derived(String(sections.length).padStart(2, '0'));
const index = $derived(String(active + 1).padStart(2, '0'));

function sync(): void {
  const line = window.innerHeight * 0.45;
  const tops = sections.map(
    (section) =>
      document.getElementById(section.id)?.getBoundingClientRect().top ?? 0,
  );
  const hidden = [
    ...document.querySelectorAll<HTMLElement>('[data-dock-hide]'),
  ].map((node) => {
    const box = node.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom };
  });
  const next = dockState(tops, line, hidden);
  active = next.active;
  on = next.on;
  if (!on) open = false;
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') open = false;
}

function onPointer(event: PointerEvent): void {
  if (!open || !root) return;
  if (!root.contains(event.target as Node)) open = false;
}

onMount(() => {
  sync();
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPointer);
  return () => {
    window.removeEventListener('scroll', sync);
    window.removeEventListener('resize', sync);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPointer);
  };
});
</script>

<nav
  class="dock"
  class:on
  class:open
  bind:this={root}
  aria-label={t('v6.dock.label')}
>
  <button
    class="dock-btn"
    type="button"
    aria-expanded={open}
    aria-controls="dock-l"
    onclick={() => (open = !open)}
  >
    <span class="num">{index} / {count}</span>
    <span class="dock-t">{sections[active]?.label}</span>
    <svg aria-hidden="true"><use href="#i-chev" /></svg>
  </button>
  <ol class="dock-l" id="dock-l">
    {#each sections as section, i (section.id)}
      <li>
        <a
          href={`#${section.id}`}
          aria-current={i === active && on ? 'location' : undefined}
        >
          <span class="num">{String(i + 1).padStart(2, '0')}</span>
          <span>{section.label}</span>
        </a>
      </li>
    {/each}
  </ol>
  <a class="dock-top" href="#axn">
    <svg aria-hidden="true"><use href="#i-up" /></svg>
    <span class="sr">{t('v6.dock.top')}</span>
  </a>
</nav>
