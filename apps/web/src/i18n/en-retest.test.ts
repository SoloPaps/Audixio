import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pack = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

/** Libellés relevés en français sur /sites, /historique, /compte et /alertes en EN (retest B8). */
const RELEVES: Record<string, string> = {
  'mq.sv.003': 'Tracked sites',
  'mq.sl.003': 'Tracked sites',
  'mq.hi.002': 'Tracked sites',
  'mq.ui.pro.sites.l': 'Tracked sites',
  'mq.sl.030': 'Last full audit: ',
  'mq.sl.060': 'Export',
  'mq.hi.019': 'Export',
  'mq.co.106': 'Export as JSON',
  'mq.co.057': ' Guides available without an API connection.',
  'mq.co.163': 'Send my message',
  'mq.al.022': 'Automatic monitoring of your tracked sites.',
  'mq.al.044': 'See also',
  'mq.hi.007': 'Last audit: ',
  'mq.hi.094': 'Last audit',
};

describe('dictionnaire EN, retest B8', () => {
  it.each(Object.entries(RELEVES))('%s est en anglais', (key, line) => {
    expect(pack[key]).toBe(line);
  });
});

describe('dictionnaire EN, retest B9', () => {
  it('le titre de /mot-de-passe-oublie se lit comme reset.title', () => {
    expect(`${pack['reset.before']} ${pack['reset.em']}`).toBe(
      pack['reset.title'],
    );
  });
});

describe('dictionnaire EN, retest C12', () => {
  it('« Sites suivis » se dit « Tracked sites » partout, fil d’Ariane compris', () => {
    for (const key of ['nav.sites.long', 'plan.sites']) {
      expect(pack[key]).toBe('Tracked sites');
    }
    const followed = Object.entries(pack).filter(([, line]) =>
      /followed sites/i.test(line),
    );
    expect(followed).toEqual([]);
  });
});
