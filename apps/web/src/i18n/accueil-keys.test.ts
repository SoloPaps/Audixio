import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { accueilEn } from './accueil-en.js';
import { accueilFr } from './accueil-fr.js';

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(here, '../components/v6/accueil');
const sources = [
  ...readdirSync(dir).map((name) => path.join(dir, name)),
  path.join(here, '../pages/index.astro'),
].map((file) => readFileSync(file, 'utf8'));

describe('textes de l’accueil v6', () => {
  it('chaque clé ac.* est affichée par un composant de l’accueil', () => {
    const unused = Object.keys(accueilFr).filter(
      (key) => !sources.some((source) => source.includes(`'${key}'`)),
    );
    expect(unused).toEqual([]);
  });

  it('FR et EN ont les mêmes clés', () => {
    expect(Object.keys(accueilEn).sort()).toEqual(
      Object.keys(accueilFr).sort(),
    );
  });
});
