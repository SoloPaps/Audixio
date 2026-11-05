/** Chiffres et radar du constat « images », repris du comportement de la maquette. */

import { formatFixed } from '../i18n/format.js';

export interface StageImage {
  name: string;
  ext: 'JPG' | 'PNG';
  meta: string;
  now: string;
  next: string;
  save: string;
  nowW: number;
  nextW: number;
  weight: number;
  angle: number;
  depth: number;
}

export const stageImages: readonly StageImage[] = [
  {
    name: 'hero-banner-atelier.jpg',
    ext: 'JPG',
    meta: '4000 × 2600 px · /assets/img/',
    now: '2,1 Mo',
    next: '~ 180 Ko',
    save: '−91,4 %',
    nowW: 1,
    nextW: 0.0857,
    weight: 2100,
    angle: 0.55,
    depth: 0.68,
  },
  {
    name: 'fondateur-portrait.png',
    ext: 'PNG',
    meta: '2800 × 3200 px · /uploads/2024/',
    now: '1,4 Mo',
    next: '~ 95 Ko',
    save: '−93,2 %',
    nowW: 0.6667,
    nextW: 0.0452,
    weight: 1400,
    angle: 1.75,
    depth: 0.45,
  },
  {
    name: 'realisation-table-chene.jpg',
    ext: 'JPG',
    meta: '2048 × 1536 px · /assets/projets/',
    now: '580 Ko',
    next: '~ 62 Ko',
    save: '−89,3 %',
    nowW: 0.2762,
    nextW: 0.0295,
    weight: 580,
    angle: 2.75,
    depth: 0.8,
  },
  {
    name: 'bibliotheque-sur-mesure.jpg',
    ext: 'JPG',
    meta: '1920 × 1280 px · /assets/projets/',
    now: '410 Ko',
    next: '~ 55 Ko',
    save: '−86,6 %',
    nowW: 0.1952,
    nextW: 0.0262,
    weight: 410,
    angle: 3.85,
    depth: 0.58,
  },
  {
    name: 'detail-assemblage-bois.jpg',
    ext: 'JPG',
    meta: '1600 × 1200 px · /assets/savoir-faire/',
    now: '220 Ko',
    next: '~ 34 Ko',
    save: '−84,5 %',
    nowW: 0.1048,
    nextW: 0.0162,
    weight: 220,
    angle: 4.7,
    depth: 0.84,
  },
  {
    name: 'badge-label-artisans.png',
    ext: 'PNG',
    meta: '800 × 800 px · /assets/icons/',
    now: '90 Ko',
    next: '~ 12 Ko',
    save: '−86,7 %',
    nowW: 0.0429,
    nextW: 0.012,
    weight: 90,
    angle: 5.6,
    depth: 0.35,
  },
];

const BEFORE_KB = 4800;
const AFTER_KB = 438;

export function stageSeconds(kb: number, mbps: number): number {
  return (kb * 8) / 1000 / mbps;
}

export function stageLabel(seconds: number): string {
  const digits = seconds < 1 ? 2 : seconds < 10 ? 1 : 0;
  return `${formatFixed(seconds, digits)} s`;
}

export function stageAt(mbps: number): {
  today: string;
  after: string;
  gain: string;
} {
  const today = stageSeconds(BEFORE_KB, mbps);
  const after = stageSeconds(AFTER_KB, mbps);
  return {
    today: stageLabel(today),
    after: stageLabel(after),
    gain: stageLabel(today - after),
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dessin figé (mouvement réduit, angle 2,3 rad) ou animé si `t` est fourni. */
export function drawRadar(
  canvas: HTMLCanvasElement,
  time: number,
  reduce: boolean,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = rect.width;
  if (size < 8) return;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tau = Math.PI * 2;
  const width = size;
  const cx = width / 2;
  const cy = width / 2;
  const radius = width / 2 - 16;
  const th = reduce ? 2.3 : ((time % 7200) / 7200) * tau;
  const head = th - Math.PI / 2;
  const trail = 1.3;
  ctx.clearRect(0, 0, width, width);
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  bg.addColorStop(0, 'rgba(61,82,160,.10)');
  bg.addColorStop(0.7, 'rgba(61,82,160,.04)');
  bg.addColorStop(1, 'rgba(61,82,160,0)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, tau);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let i = 1; i <= 4; i += 1) {
    ctx.strokeStyle = `rgba(134,151,196,${i === 4 ? 0.34 : 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy, (radius * i) / 4, 0, tau);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(134,151,196,.13)';
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();
  ctx.setLineDash([2, 7]);
  ctx.strokeStyle = 'rgba(134,151,196,.16)';
  const diag = radius * Math.SQRT1_2;
  ctx.beginPath();
  ctx.moveTo(cx - diag, cy - diag);
  ctx.lineTo(cx + diag, cy + diag);
  ctx.moveTo(cx + diag, cy - diag);
  ctx.lineTo(cx - diag, cy + diag);
  ctx.stroke();
  ctx.lineDashOffset = reduce ? 0 : -time / 55;
  ctx.setLineDash([3, 10]);
  ctx.strokeStyle = 'rgba(134,151,196,.28)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.89, 0, tau);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  for (let deg = 0; deg < 360; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const len = deg % 30 === 0 ? 13 : deg % 10 === 0 ? 8 : 4;
    ctx.strokeStyle = `rgba(134,151,196,${deg % 30 === 0 ? 0.55 : 0.25})`;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * radius, cy - Math.cos(a) * radius);
    ctx.lineTo(
      cx + Math.sin(a) * (radius - len),
      cy - Math.cos(a) * (radius - len),
    );
    ctx.stroke();
  }
  if (width >= 420) {
    ctx.font = '600 10px "JetBrains Mono",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(61,82,160,.6)';
    for (let deg = 0; deg < 360; deg += 30) {
      const a = (deg * Math.PI) / 180;
      ctx.fillText(
        String(deg),
        cx + Math.sin(a) * (radius - 26),
        cy - Math.cos(a) * (radius - 26),
      );
    }
  }
  const p = reduce ? 0.55 : (time % 3600) / 3600;
  ctx.strokeStyle = `rgba(112,145,230,${0.4 * (1 - p)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * p, 0, tau);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, tau);
  ctx.clip();
  if (typeof ctx.createConicGradient === 'function') {
    const g = ctx.createConicGradient(head - trail, cx, cy);
    const f = trail / tau;
    g.addColorStop(0, 'rgba(112,145,230,0)');
    g.addColorStop(f * 0.55, 'rgba(112,145,230,.12)');
    g.addColorStop(f, 'rgba(112,145,230,.46)');
    g.addColorStop(Math.min(f + 0.002, 1), 'rgba(112,145,230,0)');
    g.addColorStop(1, 'rgba(112,145,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, width);
  }
  ctx.restore();
  const hx = cx + Math.cos(head) * radius;
  const hy = cy + Math.sin(head) * radius;
  const lg = ctx.createLinearGradient(cx, cy, hx, hy);
  lg.addColorStop(0, 'rgba(61,82,160,0)');
  lg.addColorStop(1, 'rgba(61,82,160,.9)');
  ctx.strokeStyle = lg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  for (const item of stageImages) {
    const delta = (th - item.angle + tau) % tau;
    const k = reduce ? 0.85 : Math.max(0, 1 - delta / (tau * 0.82)) ** 1.15;
    const x = cx + Math.sin(item.angle) * radius * item.depth;
    const y = cy - Math.cos(item.angle) * radius * item.depth;
    const r = 4 + Math.sqrt(item.weight / 2100) * 9;
    ctx.fillStyle = 'rgba(225,118,63,.22)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42, 0, tau);
    ctx.fill();
    if (k < 0.02) continue;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
    gl.addColorStop(0, `rgba(243,178,140,${0.7 * k})`);
    gl.addColorStop(1, 'rgba(243,178,140,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.4, 0, tau);
    ctx.fill();
    ctx.fillStyle = `rgba(243,178,140,${0.95 * k})`;
    ctx.strokeStyle = `rgba(225,118,63,${0.9 * k})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, tau);
    ctx.fill();
    ctx.stroke();
    if (width >= 480) {
      ctx.font = '600 11px "JetBrains Mono",monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const txt = `${item.name}  ${item.now}`;
      const tw = ctx.measureText(txt).width;
      const bw = tw + 18;
      const bh = 24;
      let bx = x > cx ? x - r - 12 - bw : x + r + 12;
      bx = Math.max(4, Math.min(width - bw - 4, bx));
      roundRect(ctx, bx, y - bh / 2, bw, bh, 12);
      ctx.fillStyle = `rgba(255,255,255,${0.94 * k})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(61,82,160,${0.3 * k})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = `rgba(30,42,85,${k})`;
      ctx.fillText(txt, bx + 9, y + 0.5);
    }
  }
  const pc = reduce ? 0.4 : (time % 2000) / 2000;
  ctx.strokeStyle = `rgba(61,82,160,${0.5 * (1 - pc)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 6 + pc * 18, 0, tau);
  ctx.stroke();
  ctx.fillStyle = '#3D52A0';
  ctx.beginPath();
  ctx.arc(cx, cy, 5.5, 0, tau);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, tau);
  ctx.fill();
}

export const pictureSample = `<picture>
  <source type="image/avif"
    srcset="hero-640.avif 640w, hero-1024.avif 1024w, hero-1920.avif 1920w"
    sizes="100vw">
  <source type="image/webp"
    srcset="hero-640.webp 640w, hero-1024.webp 1024w, hero-1920.webp 1920w"
    sizes="100vw">
  <img src="hero-1024.jpg" width="1920" height="1248"
    alt="Atelier de menuiserie sur mesure"
    fetchpriority="high" decoding="async">
</picture>
`;
