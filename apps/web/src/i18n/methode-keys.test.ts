import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { GRADE_THRESHOLDS } from '@audigy/db';
import { METHOD_VERSION } from '@audigy/engine';
import { describe, expect, it } from 'vitest';
import { methodeEn } from './methode-en.js';
import { methodeFr } from './methode-fr.js';

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(here, '../components/v6/methode');
const sources = [
  ...readdirSync(dir).map((name) => path.join(dir, name)),
  path.join(here, '../pages/methode.astro'),
].map((file) => readFileSync(file, 'utf8'));

const read = (rel: string): Record<string, string> =>
  JSON.parse(
    readFileSync(new URL(`../../public/${rel}`, import.meta.url), 'utf8'),
  ) as Record<string, string>;
const frJson = read('dictionnaire-fr.json');
const enJson = read('dictionnaire-en.json');

type Key = keyof typeof methodeFr;
const keys = Object.keys(methodeFr) as Key[];

/** Budget réel du robot (packages/net/src/budget.ts). */
const budget = readFileSync(
  path.join(here, '../../../../packages/net/src/budget.ts'),
  'utf8',
);
const constant = (name: string): number =>
  Number(
    new RegExp(`${name} = ([\\d_]+)`).exec(budget)?.[1]?.replace(/_/g, ''),
  );

describe('textes de /methode v6', () => {
  it('chaque clé me.* est affichée par la page ou un de ses composants', () => {
    const unused = keys.filter(
      (key) => !sources.some((source) => source.includes(`'${key}'`)),
    );
    expect(unused).toEqual([]);
  });

  it('FR et EN ont les mêmes clés, recopiées dans les deux dictionnaires', () => {
    expect(Object.keys(methodeEn).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(frJson[key], key).toBe(methodeFr[key]);
      expect(enJson[key], key).toBe(methodeEn[key]);
    }
  });

  it('aucune note « /100 », aucun DuckDuckGo, en FR comme en EN', () => {
    for (const key of keys) {
      for (const line of [methodeFr[key], methodeEn[key]]) {
        expect(line, key).not.toMatch(/\/\s*100/);
        expect(line, key).not.toMatch(/duck\s*duck\s*go/i);
      }
    }
  });

  it('le rythme du robot est celui du code : 1 requête par seconde, 50 au plus', () => {
    expect(constant('DEFAULT_PER_HOST_INTERVAL_MS')).toBe(1000);
    expect(constant('DEFAULT_MAX_REQUESTS')).toBe(50);
    expect(methodeFr['me.n3.p']).toBe(
      'Une requête par seconde et par hôte, 50 requêtes au plus en lecture passive.',
    );
    expect(methodeEn['me.n3.p']).toBe(
      'One request per second per host, 50 requests at most in passive mode.',
    );
  });

  it('la version publiée est celle du moteur, sans point final', () => {
    expect(methodeFr['me.hero.k']).toBe(`Méthode · version ${METHOD_VERSION}`);
    expect(methodeEn['me.hero.k']).toBe(`Method · version ${METHOD_VERSION}`);
  });
});

describe('barème de /methode v6 identique à GRADE_THRESHOLDS', () => {
  const T = GRADE_THRESHOLDS;
  it('publie A à F, E et F compris, en FR et en EN', () => {
    expect(T).toEqual({ A: 90, B: 80, C: 65, D: 50, E: 35 });
    const fr: Record<string, string> = {
      'me.g.A': `${T.A} et plus`,
      'me.g.B': `${T.B} à ${T.A - 1}`,
      'me.g.C': `${T.C} à ${T.B - 1}`,
      'me.g.D': `${T.D} à ${T.C - 1}`,
      'me.g.E': `${T.E} à ${T.D - 1}`,
      'me.g.F': `moins de ${T.E}`,
    };
    const en: Record<string, string> = {
      'me.g.A': `${T.A} and above`,
      'me.g.B': `${T.B} to ${T.A - 1}`,
      'me.g.C': `${T.C} to ${T.B - 1}`,
      'me.g.D': `${T.D} to ${T.C - 1}`,
      'me.g.E': `${T.E} to ${T.D - 1}`,
      'me.g.F': `below ${T.E}`,
    };
    for (const [key, line] of Object.entries(fr)) {
      expect(methodeFr[key as Key], key).toBe(line);
      expect(frJson[key], key).toBe(line);
    }
    for (const [key, line] of Object.entries(en)) {
      expect(methodeEn[key as Key], key).toBe(line);
      expect(enJson[key], key).toBe(line);
    }
  });

  it('A est « Excellent », B « Bon », D, E et F « Problème »', () => {
    expect(methodeFr['me.l.A']).toBe('Excellent');
    expect(methodeFr['me.l.B']).toBe('Bon');
    expect(methodeEn['me.l.B']).toBe('Good');
    expect(methodeFr['me.l.P']).toBe('Problème');
  });
});
