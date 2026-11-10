import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { espaceFr } from './espace-fr.js';

function pack(name: string): Record<string, string> {
  return JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../public/${name}`, import.meta.url)),
      'utf8',
    ),
  ) as Record<string, string>;
}

describe('B2 — libellé court du seuil B sur mobile', () => {
  it('existe en FR et EN, plus court que le libellé bureau', () => {
    expect(espaceFr['mq.hi.032.narrow']).toBe('B ({n})');
    const fr = pack('dictionnaire-fr.json');
    const en = pack('dictionnaire-en.json');
    expect(fr['mq.hi.032.narrow']).toBe('B ({n})');
    expect(en['mq.hi.032.narrow']).toBe('B ({n})');
    const narrow = en['mq.hi.032.narrow'] ?? '';
    const wide = en['mq.hi.032'] ?? '';
    expect(narrow.length).toBeLessThan(wide.length);
  });
});
