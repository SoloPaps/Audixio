import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function pack(name: string): Record<string, string> {
  return JSON.parse(
    readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8'),
  ) as Record<string, string>;
}

describe('B8 — alerte baisse de note sur /pro', () => {
  it('dit que l’alerte fixe est incluse, pas un simple non', () => {
    const fr = pack('dictionnaire-fr.json');
    const en = pack('dictionnaire-en.json');
    expect(fr['mq.pro.080']).toMatch(/seuil fixe/i);
    expect(en['mq.pro.080']).toMatch(/fixed threshold/i);
    expect(fr['mq.pro.080']).not.toBe('Non');
    expect(en['mq.pro.080']).not.toBe('No');
  });
});
