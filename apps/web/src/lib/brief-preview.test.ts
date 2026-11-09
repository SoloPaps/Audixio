import { describe, expect, it } from 'vitest';
import { renderBriefMarkdown } from './brief-markdown.js';
import {
  BRIEF_TAGS,
  briefPreviewHtml,
  classifyBriefLines,
} from './brief-preview.js';
import { briefScreen } from './brief-screen.js';

// Décision du propriétaire (6 nov.) : aperçu du prompt IA structuré et coloré,
// sans toucher au texte exporté.

const items = [
  {
    checkId: 'performance.lcp',
    title: 'LCP lent',
    proof: 'LCP 4,2 s',
    mode: 'fix' as const,
  },
  {
    checkId: 'securite.frames',
    title: 'Cadres <iframe>',
    proof: 'pas de XFO & co',
    mode: 'verif' as const,
  },
];

function plain(html: string): string {
  return html
    .replaceAll('</div>', '\n')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');
}

describe('aperçu du prompt IA', () => {
  const text = briefScreen({ url: 'https://x.test', items, verified: true });
  const lines = classifyBriefLines(text);

  it('classe titre, sections, puces, détails et note', () => {
    expect(lines[0]).toEqual({ kind: 'title', text: text.split('\n')[0] });
    const sections = lines
      .filter((line) => line.kind === 'section')
      .map((line) => line.text);
    expect(sections).toEqual([
      'Rôle',
      'Contexte du site',
      'Constats',
      'Référentiel',
      'Attendu',
      'Garde-fous',
      'Terminal',
    ]);
    expect(
      lines.find((line) => line.text === '- LCP lent — Corriger')?.kind,
    ).toBe('item');
    expect(
      lines.find((line) => line.text === '  - Preuve : LCP 4,2 s.')?.kind,
    ).toBe('detail');
    expect(lines.at(-1)).toEqual({
      kind: 'note',
      text: 'Ce fichier n’est pas une preuve.',
    });
  });

  it('colore les statuts et les clés sans changer le texte', () => {
    const html = briefPreviewHtml(text, BRIEF_TAGS);
    expect(html).toContain('<span class="l-tag fix">Corriger</span>');
    expect(html).toContain('<span class="l-tag check">Vérifier</span>');
    expect(html).toContain('<span class="l-tag fix">Fix</span>');
    expect(html).toContain('<span class="l-tag check">Vérif</span>');
    expect(html).toContain('<span class="l-k">Preuve</span>');
    expect(html).toContain('<div class="l l-h2">Constats</div>');
    expect(html).not.toContain('<iframe>');
    expect(plain(html)).toBe(`${text.replace(/\n+$/, '')}\n`);
  });

  it('reconnaît aussi les statuts anglais', () => {
    const en = renderBriefMarkdown({
      level: 'complet',
      url: 'https://x.test',
      at: null,
      items,
      locale: 'en',
    });
    const html = briefPreviewHtml(en, BRIEF_TAGS);
    expect(html).toContain('<span class="l-tag fix">Fix</span>');
    expect(html).toContain('<span class="l-tag check">Check</span>');
    expect(plain(html)).toBe(`${en.replace(/\n+$/, '')}\n`);
  });
});
