import { readdirSync, readFileSync } from 'node:fs';
import { parseFix, variantFor } from '@audigy/engine/fixes';
import { afterEach, describe, expect, it } from 'vitest';
import { lintText } from '../../../../scripts/copy-lint.js';
import { installPack } from '../i18n/pack.js';
import { fixesFor, localizedSheet, localizedSteps } from './fix-catalog.js';
import { stepsFromVariant } from './fix-steps.js';

const variants = ['netlify', 'github_pages', 'generic'] as const;

const pack = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const dir = new URL('../../../../packages/engine/fixes/fr/', import.meta.url);
const sheets = readdirSync(dir)
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const id = name.replace(/\.md$/u, '');
    return parseFix(id, readFileSync(new URL(name, dir), 'utf8'));
  });

describe('catalogue anglais des fiches (C3)', () => {
  afterEach(() => {
    installPack(null);
  });

  it('chaque fiche française a un titre et une raison en anglais', () => {
    expect(sheets.length).toBeGreaterThan(60);
    for (const sheet of sheets) {
      for (const [field, french] of [
        ['title', sheet.title],
        ['why', sheet.why],
      ] as const) {
        const key = `fix.${sheet.id}.${field}`;
        const line = pack[key];
        expect(line, key).toBeTruthy();
        expect(line, key).not.toBe(french);
        expect(line, key).not.toMatch(/[àâçéèêëîïôûùœ]/iu);
        const issues = lintText(line ?? '', key).filter(
          (issue) => issue.level === 'error',
        );
        expect(issues, key).toEqual([]);
      }
    }
  });

  it('chaque étape française a sa traduction anglaise', () => {
    for (const sheet of sheets) {
      for (const variant of variants) {
        const french = stepsFromVariant(sheet.variants[variant]);
        french.steps.forEach((step, index) => {
          const key = `fix.${sheet.id}.${variant}.${index + 1}`;
          const line = pack[key];
          expect(line, key).toBeTruthy();
          expect(line, key).not.toBe(step);
          const prose = (line ?? '').replace(/`[^`]*`/gu, '');
          expect(prose, key).not.toMatch(/[àâçéèêëîïôûùœ«»]/iu);
          const issues = lintText(line ?? '', key).filter(
            (issue) => issue.level === 'error',
          );
          expect(issues, key).toEqual([]);
        });
      }
    }
  });

  it('aucune ligne fix.* sans fiche française', () => {
    const byId = new Map(sheets.map((sheet) => [sheet.id, sheet]));
    const orphans = Object.keys(pack)
      .filter((key) => key.startsWith('fix.'))
      .filter((key) => {
        const field = /^fix\.(.+)\.(title|why)$/u.exec(key);
        if (field) return !byId.has(field[1] ?? '');
        const step =
          /^fix\.(.+)\.(netlify|github_pages|generic)\.(\d+|code)$/u.exec(key);
        const sheet = byId.get(step?.[1] ?? '');
        if (!step || !sheet) return true;
        const variant = step[2] as (typeof variants)[number];
        const french = stepsFromVariant(sheet.variants[variant]);
        if (step[3] === 'code') return french.code === undefined;
        const index = Number(step[3]);
        return index < 1 || index > french.steps.length;
      });
    expect(orphans).toEqual([]);
  });

  it('affiche les étapes en anglais quand EN est actif, le français sinon', () => {
    const frSteps = fixesFor('netlify').get('securite.hsts')?.steps;
    expect(frSteps?.[0]).toBe(
      'Ouvrez ou créez le fichier `_headers` à la racine du site publié.',
    );
    installPack(pack);
    const en = fixesFor('netlify').get('securite.hsts');
    expect(en?.steps[0]).toBe(
      'Open or create the `_headers` file at the root of the published site.',
    );
    expect(en?.steps).toHaveLength(frSteps?.length ?? -1);
    expect(fixesFor('other').get('seo.title')?.steps[0]).toBe(
      'Set a single title in the head of the page.',
    );
    expect(fixesFor('netlify').get('seo.title')?.code).toBe(
      '<title>Osteopathy practice in Lyon</title>',
    );
    installPack(null);
    expect(fixesFor('netlify').get('securite.hsts')?.steps).toEqual(frSteps);
  });

  it('garde la liste française entière si une étape manque en anglais', () => {
    const sheet = sheets.find((item) => item.id === 'securite.hsts');
    expect(sheet).toBeTruthy();
    if (!sheet) return;
    const french = stepsFromVariant(variantFor(sheet, 'netlify'));
    installPack({ 'fix.securite.hsts.netlify.1': 'Only the first step.' });
    expect(localizedSteps('securite.hsts', 'netlify', french)).toEqual(french);
  });

  it('suit la langue active, avec repli sur le français', () => {
    const frFrames = fixesFor('netlify').get('securite.frames');
    expect(frFrames?.title).toBe("Interdire l'affichage dans un cadre");
    installPack(pack);
    const enFrames = fixesFor('netlify').get('securite.frames');
    expect(enFrames?.title).toBe('Forbid display inside a frame');
    expect(enFrames?.why).toBe(
      'Another site can then present your pages as its own and mislead a visitor.',
    );
    expect(enFrames?.effortMinutes).toBe(frFrames?.effortMinutes);
    installPack({ 'login.submit': 'Sign in' });
    expect(
      localizedSheet('securite.frames', { title: 'Titre', why: 'Raison.' }),
    ).toEqual({ title: 'Titre', why: 'Raison.' });
    installPack(null);
    expect(fixesFor('netlify').get('securite.frames')?.title).toBe(
      "Interdire l'affichage dans un cadre",
    );
  });
});
