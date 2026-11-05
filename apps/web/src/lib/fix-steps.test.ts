import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { stepsFromVariant } from './fix-steps.js';

describe('stepsFromVariant', () => {
  it('sépare les étapes et le bloc copiable', () => {
    const text = readFileSync(
      path.resolve('packages/engine/fixes/fr/securite.https.md'),
      'utf8',
    );
    const generic = text.split('## generic')[1] ?? '';
    const parsed = stepsFromVariant(generic);
    expect(parsed.steps[0]).toBe('Activez le certificat de votre hébergeur.');
    expect(parsed.code).toContain('Strict-Transport-Security');
    expect(parsed.steps.some((step) => step.includes('```'))).toBe(false);
  });
});

describe('stepsFromVariant, blocs par étape (QA Mo M1)', () => {
  it('rattache chaque bloc de code à l’étape qui l’annonce', () => {
    const text = readFileSync(
      path.resolve('packages/engine/fixes/fr/securite.frames.md'),
      'utf8',
    );
    const generic = text.split('## generic')[1] ?? '';
    const parsed = stepsFromVariant(generic);
    expect(parsed.steps).toHaveLength(4);
    expect(parsed.snippets).toEqual([
      "Content-Security-Policy: frame-ancestors 'none'",
      'X-Frame-Options: DENY',
      null,
      null,
    ]);
  });
});
