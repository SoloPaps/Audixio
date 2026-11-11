<script module lang="ts">
/** Compteur d’identifiants : un tracé de bande par cadran sur la page. */
let gauges = 0;
</script>

<script lang="ts">
import { GRADE_THRESHOLDS, gradeForScore } from '@audigy/db';
import { gradeLabel } from '../lib/grade.js';
import { t } from '../i18n/index.js';
import '../styles/maquettes/gauge.css';
import {
  GAUGE,
  gaugeBands,
  gaugeFillDash,
  gaugeLabel,
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
/** Un seul tracé de bande par cadran, repris par les six bandes (<use>). */
const bandId = `gb${++gauges}`;
const scoreAttr = $derived(score === null ? 'none' : String(score));
const fillDash = $derived(gaugeFillDash(score));
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
  style={`width: ${frame}; max-width: 100%; container-type: inline-size`}
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
        <defs><path id={bandId} d={bandRing} pathLength="100" /></defs>
        <g class="gauge-bands" fill="none">
          {#each bands as band (band.grade)}
            <use
              class="gauge-band"
              class:on={grade === band.grade}
              data-band={band.grade}
              href={`#${bandId}`}
              stroke-dasharray={`${Math.max(0, band.to - band.from - 0.8)} 100`}
              stroke-dashoffset={-band.from - 0.4}
            />
          {/each}
        </g>
      {/if}
      <path class="gauge-track" d={ring} fill="none" stroke-width="14" />
      <path
        class="gauge-fill"
        d={ring}
        fill="none"
        stroke-width="14"
        pathLength="100"
        stroke-dasharray={fillDash}
        stroke-dashoffset="0"
      />
    </svg>
    <p class="gauge-hole" aria-hidden="true">
      <span class="score-num">{score === null ? t('score.empty') : score}</span>{#if score !== null}<span class="score-denom">{t('gauge.denom')}</span>{/if}
    </p>
  </div>
  <div class="gauge-status" aria-hidden="true">
    {#if grade}<i class="gauge-grade">{grade}</i>{/if}
    <StatusMark {level} label={grade ? gradeLabel(grade) : undefined} />
  </div>
</div>

<style>
  /* Tracé, texte et teintes par lettre : maquettes/gauge.css, chargée avec
     le composant (pas de classes de portée répétées dans le HTML). Largeur et
     container-type : style en ligne, le cadran tient sans feuille de style. */
  .gauge[data-size='hero'] {
    view-transition-name: audigy-gauge;
  }
</style>
