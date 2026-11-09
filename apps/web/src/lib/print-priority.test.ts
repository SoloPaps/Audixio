import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '../i18n/index.js';
import { installPack } from '../i18n/pack.js';
import { printPriorityTitle } from './print-priority.js';

// QA Mo 05/11 B5 (bug_e3ae85d2) : « The 5 priorities » pour 4 éléments.

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

function title(count: number): string {
  return printPriorityTitle(
    count,
    t('pdf.prio.title', { n: count }),
    t('pdf.prio.empty'),
    t('pdf.prio.title.one'),
  );
}

afterEach(() => {
  installPack(null);
});

describe('B5 — le titre des priorités suit le nombre listé', () => {
  it('en français', () => {
    expect(title(4)).toBe('Les 4 priorités');
    expect(title(5)).toBe('Les 5 priorités');
    expect(title(1)).toBe('La priorité');
    expect(title(0)).toBe('Aucune priorité ouverte sur cet audit.');
  });

  it('en anglais', () => {
    installPack(en);
    expect(title(4)).toBe('The 4 priorities');
    expect(title(2)).toBe('The 2 priorities');
    expect(title(1)).toBe('The priority');
    expect(title(0)).toBe('No open priority on this audit.');
    for (let count = 2; count <= 5; count += 1) {
      expect(title(count)).toContain(String(count));
    }
  });
});
