import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  hostFromProgressQuery,
  progressSceneSimulates,
} from './progress-target.js';

function source(name: string): string {
  return readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');
}

describe('garde maquette audit', () => {
  it('résout ?url= et n’inscrit pas atelier-martin.fr pour ?id= ou ?site=', () => {
    const search = `?url=${encodeURIComponent('https://bon.audigy.test/')}`;
    expect(hostFromProgressQuery(search)).toBe('bon.audigy.test');
    expect(
      hostFromProgressQuery('?id=00000000-0000-4000-8000-0000000000b2'),
    ).toBeNull();
    expect(hostFromProgressQuery('?site=site-1')).toBeNull();
    expect(hostFromProgressQuery('?id=audit')).not.toBe('atelier-martin.fr');
    expect(hostFromProgressQuery('?site=site-1')).not.toBe('atelier-martin.fr');
    const page = source('../pages/progression.astro');
    expect(page).not.toContain('mq.p.001');
    expect(page).not.toContain('atelier-martin.fr');
    expect(page).toContain('data-i18n-skip');
  });

  it('n’anime pas la maquette quand un audit est demandé', () => {
    expect(progressSceneSimulates('?id=abc')).toBe(false);
    expect(progressSceneSimulates('?url=https://bon.audigy.test/')).toBe(false);
    expect(progressSceneSimulates('?site=abc')).toBe(false);
    expect(progressSceneSimulates('')).toBe(true);
    expect(progressSceneSimulates('?theme=light')).toBe(true);
    expect(progressSceneSimulates('?maquette=1')).toBe(true);
    expect(progressSceneSimulates('?maquette=1&theme=light')).toBe(true);
    const scene = source('./progress-scene.ts');
    expect(scene).toContain('progressSceneSimulates(location.search)');
    expect(scene).toContain('setInterval(tick, TICK_MS)');
  });

  it('réserve l’adresse et l’heure de démonstration au bloc maquette', () => {
    const html = source('../pages/audit-echoue.astro');
    const start = html.indexOf('id="failure-maquette"');
    const end = html.indexOf('<!-- /failure-maquette -->');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = html.slice(start, end);
    const rest = html.slice(0, start) + html.slice(end);
    expect(block).toContain('mq.lg.607');
    expect(block).toContain('mq.lg.613');
    expect(rest).not.toContain('mq.lg.607');
    expect(rest).not.toContain('mq.lg.613');
    expect(rest).not.toContain('location.href="/progression"');
  });
});
