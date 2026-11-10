import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function pack(name: string): Record<string, string> {
  return JSON.parse(
    readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8'),
  ) as Record<string, string>;
}

describe('B5 — confidentialité et page cookies', () => {
  it('n’affirme plus l’absence de tout bandeau', () => {
    const fr = pack('dictionnaire-fr.json');
    const en = pack('dictionnaire-en.json');
    expect(fr['mq.lg.183']).toMatch(/bandeau seulement/i);
    expect(en['mq.lg.183']).toMatch(/banner only/i);
    expect(fr['mq.lg.183']).not.toMatch(/^Zéro bandeau/i);
    expect(en['mq.lg.183']).not.toMatch(/^No banner/i);
  });
});
