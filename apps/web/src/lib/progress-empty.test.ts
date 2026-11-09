import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { progressEmpty, progressSceneSimulates } from './progress-target.js';

function source(name: string): string {
  return readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');
}

describe('progression sans audit', () => {
  it('n’ouvre pas une analyse fictive ni le rapport d’exemple', () => {
    expect(progressEmpty('')).toBe(true);
    expect(progressEmpty('?theme=light')).toBe(true);
    expect(progressEmpty('?theme=dark')).toBe(true);
    expect(progressEmpty('?maquette=1')).toBe(false);
    expect(progressEmpty('?maquette=1&theme=light')).toBe(false);
    expect(progressEmpty('?id=00000000-0000-4000-8000-0000000000b2')).toBe(
      false,
    );
    expect(progressEmpty('?url=https://bon.audigy.test/')).toBe(false);
    expect(progressEmpty('?site=site-1')).toBe(false);
    expect(progressSceneSimulates('')).toBe(false);
    expect(progressSceneSimulates('?theme=dark')).toBe(false);
    expect(progressSceneSimulates('?maquette=1&theme=light')).toBe(true);
    const page = source('../pages/progression.astro');
    expect(page).toContain('progress.empty.title');
    expect(page).toContain("dataset.progressEmpty = '1'");
    expect(page).not.toContain('href="/exemple-rapport"');
    const scene = source('./progress-scene.ts');
    const simulateAt = scene.indexOf(
      'if (progressSceneSimulates(location.search))',
    );
    const intervalAt = scene.indexOf('setInterval(tick, TICK_MS)');
    expect(simulateAt).toBeGreaterThan(-1);
    expect(intervalAt).toBeGreaterThan(simulateAt);
    expect(scene).toContain('progressEmpty(search)');
  });
});
