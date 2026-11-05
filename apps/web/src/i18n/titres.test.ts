import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HOME_EXAMPLE_SCORE } from '../lib/home-example.js';
import { gaugeLabel } from '../lib/score.js';
import { fr, t } from './index.js';

const pack = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;
const french = fr as Record<string, string>;

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return path.endsWith('.astro') ? [path] : [];
  });
}

const root = fileURLToPath(new URL('../pages', import.meta.url));
const keys = [
  ...new Set(
    pages(root).flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/title=\{t\('([^']+)'\)\}/g)].map(
        (m) => m[1] ?? '',
      ),
    ),
  ),
].sort();

// « Page — Marque » partout : un seul séparateur, jamais « · » ni « | » (retest C10).
const FORMAT = /^(?!.*\s[·|]\s)[^—]+ — \S+$/;

describe('titres d’onglet (C10)', () => {
  it('relève les titres de toutes les pages', () => {
    expect(keys.length).toBeGreaterThan(35);
  });

  it.each(keys)('%s est un titre méta au format « Page — Marque »', (key) => {
    expect(key).toMatch(/\.meta\.|^meta\./);
    expect(french[key]).toMatch(FORMAT);
    expect(pack[key]).toMatch(FORMAT);
    expect(pack[key]).not.toBe(french[key]);
  });
});

describe('jauge d’exemple de l’accueil (C10)', () => {
  it('le libellé figé reprend la jauge calculée, en français', () => {
    expect(t('mq.ui.home.gauge')).toBe(
      gaugeLabel(t('domain.global'), HOME_EXAMPLE_SCORE),
    );
  });

  it('le libellé figé a sa version anglaise', () => {
    const english = (pack['gauge.score'] ?? '')
      .replace('{domain}', pack['domain.global'] ?? '')
      .replace('{score}', String(HOME_EXAMPLE_SCORE))
      .replace('{level}', pack['level.improve.sentence'] ?? '');
    expect(pack['mq.ui.home.gauge']).toBe(english);
  });
});
