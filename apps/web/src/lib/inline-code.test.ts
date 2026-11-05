import { describe, expect, it } from 'vitest';
import { splitInlineCode } from './inline-code.js';

describe('splitInlineCode', () => {
  it('isole `_headers` en segment code (FR et EN)', () => {
    expect(
      splitInlineCode('Ouvrez ou créez le fichier `_headers` à la racine.'),
    ).toEqual([
      { code: false, text: 'Ouvrez ou créez le fichier ' },
      { code: true, text: '_headers' },
      { code: false, text: ' à la racine.' },
    ]);
    const en = splitInlineCode('Open or create the `_headers` file.');
    expect(en.filter((s) => s.code).map((s) => s.text)).toEqual(['_headers']);
    expect(en.map((s) => s.text).join('')).not.toContain('`');
  });

  it('garde le HTML comme texte brut et un backtick orphelin', () => {
    expect(splitInlineCode('`<img onerror=x>` et `a')).toEqual([
      { code: true, text: '<img onerror=x>' },
      { code: false, text: ' et `a' },
    ]);
    expect(splitInlineCode('')).toEqual([]);
  });
});
