import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mqLegalFr } from './mq-legal-fr.js';

function pack(name: string): Record<string, string> {
  return JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../public/${name}`, import.meta.url)),
      'utf8',
    ),
  ) as Record<string, string>;
}

describe('B5 — badge héros de /confidentialite', () => {
  it('ne nie plus l’existence du bandeau de choix', () => {
    expect(mqLegalFr['mq.lg.178']).toBe(
      'Zéro traceur tiers · un bandeau pour vos choix',
    );
    expect(mqLegalFr['mq.lg.178']).not.toMatch(/pas de bannière/i);
    const fr = pack('dictionnaire-fr.json');
    const en = pack('dictionnaire-en.json');
    expect(fr['mq.lg.178']).toBe(mqLegalFr['mq.lg.178']);
    expect(en['mq.lg.178']).toBe(
      'Zero third-party trackers · a banner for your choices',
    );
    expect(en['mq.lg.178']).not.toMatch(/no banner/i);
  });
});
