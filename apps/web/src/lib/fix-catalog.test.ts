import { readdirSync, readFileSync } from 'node:fs';
import { parseFix } from '@audigy/engine/fixes';
import { afterEach, describe, expect, it } from 'vitest';
import { lintText } from '../../../../scripts/copy-lint.js';
import { installPack } from '../i18n/pack.js';
import { fixesFor, localizedSheet } from './fix-catalog.js';

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

  it('aucune ligne fix.* sans fiche française', () => {
    const ids = new Set(sheets.map((sheet) => sheet.id));
    const orphans = Object.keys(pack)
      .filter((key) => key.startsWith('fix.'))
      .filter((key) => {
        const match = /^fix\.(.+)\.(title|why)$/u.exec(key);
        return !match || !ids.has(match[1] ?? '');
      });
    expect(orphans).toEqual([]);
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
