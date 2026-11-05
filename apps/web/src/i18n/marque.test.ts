import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { briefEn } from './brief-en.js';
import { briefFr } from './brief-fr.js';
import { fr, t } from './index.js';

// Retest C8 : l’ancienne marque ne doit plus apparaître dans les textes vus
// par les visiteurs (titres, descriptions, prompt du brief). Le nom de
// commande « audigy » et le domaine audigyweb.fr sont des identifiants.
function dictionary(name: string): Record<string, string> {
  return JSON.parse(
    readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8'),
  ) as Record<string, string>;
}

function oldBrand(values: Record<string, string>): string[] {
  return Object.entries(values)
    .filter(([, value]) => /Audigy/.test(value))
    .map(([key]) => key);
}

describe('marque Audixio (retest C8)', () => {
  it('aucun texte FR ou EN ne garde « Audigy »', () => {
    expect(oldBrand(fr as Record<string, string>)).toEqual([]);
    expect(oldBrand(briefFr)).toEqual([]);
    expect(oldBrand(briefEn)).toEqual([]);
    expect(oldBrand(dictionary('dictionnaire-fr.json'))).toEqual([]);
    expect(oldBrand(dictionary('dictionnaire-en.json'))).toEqual([]);
  });

  it('les titres et descriptions statiques portent Audixio', () => {
    expect(t('brand.name')).toBe('Audixio');
    expect(t('home.title')).toBe('Audixio');
    expect(t('meta.report.title')).toBe('Rapport — Audixio');
    expect(t('meta.sites.title')).toBe('Vos sites — Audixio');
    expect(t('meta.home.description')).toMatch(/^Audixio audite un site/);
    expect(briefFr['brief.role.fix']).toBe(
      'Vous corrigez le site {url} d’après un audit Audixio.',
    );
    expect(briefEn['brief.role.fix']).toBe(
      'You are fixing the site {url} based on an Audixio audit.',
    );
  });
});
