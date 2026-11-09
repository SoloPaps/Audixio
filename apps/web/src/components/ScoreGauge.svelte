<script lang="ts">
import { GRADE_THRESHOLDS, gradeForScore } from '@audigy/db';
import { t } from '../i18n/index.js';
import '../styles/maquettes/grade.css';
import {
  GAUGE,
  gaugeBands,
  gaugeLabel,
  gaugePoint,
  gaugeRing,
  levelForScore,
} from '../lib/score.js';
import StatusMark from './StatusMark.svelte';

/**
 * Cadran du score (refonte, décision owner du 6 nov.) : anneau complet,
 * nombre au centre, lettre du barème officiel à côté du statut, et bandes
 * A–F autour de l’anneau pour situer le score. Mêmes couleurs de lettre que
 * les pastilles du rapport, en clair et en sombre.
 */
interface Props {
  domain: string;
  score: number | null;
  size?: 'hero' | 'compact' | 'mini';
  /** Libellé figé d’un exemple, traduisible tel quel par le dictionnaire EN. */
  label?: string;
}

let { domain, score, size = 'compact', label: fixed }: Props = $props();
const level = $derived(levelForScore(score));
const grade = $derived(gradeForScore(score));
const label = $derived(fixed ?? gaugeLabel(domain, score));
const ring = gaugeRing(GAUGE.cx, GAUGE.cy, GAUGE.r);
const bandRing = gaugeRing(GAUGE.cx, GAUGE.cy, GAUGE.band);
const bands = gaugeBands(GRADE_THRESHOLDS);
const tip = $derived(
  score === null ? null : gaugePoint(GAUGE.cx, GAUGE.cy, GAUGE.r, score),
);
const scoreAttr = $derived(score === null ? 'none' : String(score));
const frame = $derived(
  size === 'hero'
    ? 'var(--gauge-hero, 13rem)'
    : size === 'mini'
      ? 'var(--gauge-mini, 4rem)'
      : 'var(--gauge-size, 8rem)',
);
</script>

<div
  class="gauge"
  data-size={size}
  data-score={scoreAttr}
  data-level={level}
  data-grade={grade ?? 'none'}
  role="img"
  aria-label={label}
  style={`width: ${frame}; max-width: 100%; container-type: inline-size; --gx: ${GAUGE.cx}; --gy: ${GAUGE.cy}; --gw: ${GAUGE.width}; --gh: ${GAUGE.height}`}
>
  <div class="gauge-figure">
    <svg
      aria-hidden="true"
      viewBox={GAUGE.viewBox}
      width={GAUGE.width}
      height={GAUGE.height}
      data-cx={GAUGE.cx}
      data-cy={GAUGE.cy}
      data-r={GAUGE.r}
    >
      {#if size !== 'mini'}
        {#each bands as band (band.grade)}
          <path
            class="gauge-band"
            class:on={grade === band.grade}
            fill="none"
            stroke-width="5"
            data-band={band.grade}
            d={bandRing}
            pathLength="100"
            stroke-dasharray={`${Math.max(0, band.to - band.from - 0.8)} 100`}
            stroke-dashoffset={-band.from - 0.4}
          />
        {/each}
      {/if}
      <path class="gauge-track" d={ring} fill="none" stroke-width="14" />
      <path
        class="gauge-fill"
        d={ring}
        fill="none"
        stroke-width="14"
        pathLength="100"
        stroke-dasharray={`${score ?? 0} 100`}
        style={`--score: ${score ?? 0}`}
      />
      {#if tip && score !== null && score > 0}
        <circle class="gauge-tip" cx={tip.x} cy={tip.y} r="7" stroke-width="3" />
      {/if}
    </svg>
    <p class="gauge-hole" aria-hidden="true">
      <span class="score-num">{score === null ? t('score.empty') : score}</span>{#if score !== null}<span class="score-denom">{t('gauge.denom')}</span>{/if}
    </p>
  </div>
  <div class="gauge-status" aria-hidden="true">
    {#if grade}<b class="gauge-grade">{grade}</b>{/if}
    <StatusMark {level} />
  </div>
</div>

<style>
  .gauge {
    /* Lettres du barème : teintes dans maquettes/grade.css (clair + sombre). */
    --g-ink: var(--grade-none, var(--score-untested));
    --g-bg: var(--grade-none-bg, var(--score-untested-bg));
    --g-band: var(--grade-band, var(--score-untested-bg));
    --g-track: var(--grade-track, var(--score-untested-bg));
    container-type: inline-size;
    width: var(--gauge-size, 8rem);
    max-width: 100%;
    height: auto;
  }

  .gauge[data-grade='A'] {
    --g-ink: var(--grade-a);
    --g-bg: var(--grade-a-bg);
  }
  .gauge[data-grade='B'] {
    --g-ink: var(--grade-b);
    --g-bg: var(--grade-b-bg);
  }
  .gauge[data-grade='C'] {
    --g-ink: var(--grade-c);
    --g-bg: var(--grade-c-bg);
  }
  .gauge[data-grade='D'] {
    --g-ink: var(--grade-d);
    --g-bg: var(--grade-d-bg);
  }
  .gauge[data-grade='E'] {
    --g-ink: var(--grade-e);
    --g-bg: var(--grade-e-bg);
  }
  .gauge[data-grade='F'] {
    --g-ink: var(--grade-f);
    --g-bg: var(--grade-f-bg);
  }

  .gauge[data-size='hero'] {
    width: var(--gauge-hero, 13rem);
    view-transition-name: audigy-gauge;
  }

  .gauge[data-size='mini'] {
    width: var(--gauge-mini, 4rem);
  }

  .gauge-figure {
    position: relative;
    aspect-ratio: 1;
  }

  svg {
    position: relative;
    z-index: 0;
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    transform: none;
  }

  .gauge-band {
    fill: none;
    stroke: var(--g-band);
    stroke-linecap: butt;
  }

  .gauge-band.on {
    stroke: var(--g-ink);
  }

  .gauge-track,
  .gauge-fill {
    fill: none;
    stroke-linecap: round;
  }

  .gauge-track {
    stroke: var(--g-track);
  }

  .gauge-fill {
    stroke: var(--g-ink);
    stroke-dasharray: var(--score) 100;
  }

  .gauge-tip {
    fill: var(--g-ink);
    stroke: var(--surface);
  }

  @media (prefers-reduced-motion: no-preference) {
    .gauge-fill {
      animation: gauge-rise var(--duration-gauge, 0.4s) var(--ease-out, ease-out) both;
    }
  }

  @keyframes gauge-rise {
    from {
      stroke-dasharray: 0 100;
    }
  }

  .gauge-hole {
    position: absolute;
    z-index: 1;
    left: calc(var(--gx) / var(--gw) * 100%);
    top: calc(var(--gy) / var(--gh) * 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: max-content;
    max-width: none;
    margin: 0;
    color: var(--ink);
    font-size: 24cqw;
    line-height: 1;
    text-align: center;
    transform: translate(-50%, -50%);
  }

  .score-num {
    font-size: 1em;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    white-space: nowrap;
  }

  .score-denom {
    margin-top: 0.2em;
    color: var(--ink-2);
    font-size: max(var(--text-xs, 0.75rem), 0.36em);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
  }

  .gauge-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2, 0.5rem);
    position: relative;
    left: 50%;
    width: max-content;
    margin-top: var(--space-2, 0.5rem);
    transform: translateX(-50%);
    white-space: nowrap;
  }

  .gauge-grade {
    display: inline-grid;
    place-items: center;
    min-width: 1.9em;
    height: 1.9em;
    padding: 0 0.35em;
    border-radius: 0.5rem;
    background: var(--g-bg);
    color: var(--g-ink);
    font-size: var(--text-sm, 0.875rem);
    font-weight: 800;
    line-height: 1;
  }

  /* Le thème sombre efface le fond des balises de texte : la pastille le garde. */
  :global(html[data-theme='dark']) .gauge .gauge-grade {
    background: var(--g-bg);
    color: var(--g-ink);
  }

  .gauge[data-size='mini'] .gauge-status {
    display: none;
  }
</style>
