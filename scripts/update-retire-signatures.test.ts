import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkedText, keptLibraries } from './update-retire-signatures.ts';

const copy = JSON.parse(
  readFileSync('packages/engine/data/retire/signatures.json', 'utf8'),
) as { libraries: Record<string, unknown> };

describe('update-retire-signatures valide le contenu téléchargé', () => {
  it('accepte les extracteurs de la copie versionnée', () => {
    const upstream = Object.fromEntries(
      Object.entries(copy.libraries).map(([name, extractors]) => [
        name,
        { extractors, vulnerabilities: [{ below: '1' }] },
      ]),
    );
    expect(keptLibraries(JSON.stringify(upstream))).toEqual(copy.libraries);
  });

  it.each([
    [
      'nom de bibliothèque piégé',
      { '../../etc': { extractors: { uri: ['a'] } } },
    ],
    ['extracteur non textuel', { jquery: { extractors: { uri: [{ x: 1 }] } } }],
    [
      'extracteur démesuré',
      { jquery: { extractors: { filename: ['a'.repeat(5000)] } } },
    ],
    [
      'empreinte invalide',
      { jquery: { extractors: { hashes: { 'zz<script>': '1.0' } } } },
    ],
    ['racine non objet', ['jquery']],
  ])('refuse un %s', (_label, source) => {
    expect(() => keptLibraries(JSON.stringify(source))).toThrow();
  });

  it('refuse un texte de licence avec caractères de contrôle ou trop long', () => {
    expect(checkedText('Apache License 2.0\n', 'LICENSE.md')).toBe(
      'Apache License 2.0\n',
    );
    expect(() => checkedText('a\u0000b', 'LICENSE.md')).toThrow();
    expect(() => checkedText('a'.repeat(200_000), 'NOTICE.md')).toThrow();
  });
});
