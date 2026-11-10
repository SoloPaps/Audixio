import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function pack(name: string): Record<string, string> {
  return JSON.parse(
    readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8'),
  ) as Record<string, string>;
}

import { ACCOUNT_EXPORT_FILENAME } from './account-export.js';

describe('B7 — libellé d’export du compte', () => {
  it('reprend le nom du fichier réellement téléchargé', () => {
    const fr = pack('dictionnaire-fr.json');
    const en = pack('dictionnaire-en.json');
    expect(fr['mq.co.105']).toBe(ACCOUNT_EXPORT_FILENAME);
    expect(en['mq.co.105']).toBe(ACCOUNT_EXPORT_FILENAME);
    expect(fr['mq.co.105']).not.toMatch(/Ko|KB|export_2026/i);
  });
});
