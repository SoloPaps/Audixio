import { crc32 as nodeCrc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { HistoryView } from './history.js';
import {
  crc32,
  historyFileName,
  historyFormats,
  historyJson,
  historyPdf,
  historyXlsx,
} from './history-export.js';

const view: HistoryView = {
  series: [
    { id: 'global', label: 'Note globale' },
    { id: 'perf', label: 'Performance' },
  ],
  points: [
    {
      id: 'a',
      at: '2026-01-12T10:00:00Z',
      href: '/r/a',
      scores: { global: 72, perf: null },
    },
    {
      id: 'b',
      at: '2026-05-03T10:00:00Z',
      href: '/r/b',
      scores: { global: 88, perf: 91 },
    },
  ],
  snapshots: [],
};

function latin1(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
}

/** Lit une archive zip stockée : nom → contenu, CRC vérifié par zlib. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, string>();
  let offset = 0;
  while (data.getUint32(offset, true) === 0x04034b50) {
    expect(data.getUint16(offset + 8, true)).toBe(0);
    const crc = data.getUint32(offset + 14, true);
    const size = data.getUint32(offset + 18, true);
    const nameLength = data.getUint16(offset + 26, true);
    const extra = data.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(
      bytes.subarray(offset + 30, offset + 30 + nameLength),
    );
    const start = offset + 30 + nameLength + extra;
    const body = bytes.subarray(start, start + size);
    expect(nodeCrc32(body)).toBe(crc);
    files.set(name, new TextDecoder().decode(body));
    offset = start + size;
  }
  expect(data.getUint32(offset, true)).toBe(0x02014b50);
  return files;
}

describe('historyFormats (matrice des droits)', () => {
  it('donne CSV et PDF à tout compte, Excel et JSON en plus au Pro', () => {
    expect(historyFormats(null)).toEqual(['csv', 'pdf']);
    expect(historyFormats('free')).toEqual(['csv', 'pdf']);
    expect(historyFormats('pro')).toEqual(['csv', 'pdf', 'xlsx', 'json']);
  });

  it('nomme les fichiers d’après le site', () => {
    expect(historyFileName('Bon.Audigy.test', 'pdf')).toBe(
      'audixio-historique-bon.audigy.test.pdf',
    );
    expect(historyFileName('', 'xlsx')).toBe('audixio-historique-site.xlsx');
  });
});

describe('historyPdf', () => {
  it('produit un PDF valide avec le site et les notes', () => {
    const text = latin1(
      historyPdf(view, 'bon.audigy.test', new Date('2026-11-05T12:00:00Z')),
    );
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('bon.audigy.test');
    expect(text).toContain('(Performance)');
    expect(text).toContain('(88)');
    expect(text).toContain('(91)');
    // La table xref pointe exactement sur chaque objet.
    const xref = Number(/startxref\n(\d+)/u.exec(text)?.[1]);
    expect(text.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...text.slice(xref).matchAll(/(\d{10}) 00000 n /gu)].map(
      (m) => Number(m[1]),
    );
    offsets.forEach((offset, index) => {
      expect(text.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true);
    });
  });

  it('échappe les parenthèses et encode les accents en WinAnsi', () => {
    const text = latin1(historyPdf(view, 'a(b).test'));
    expect(text).toContain('a\\(b\\).test');
    expect(text).toMatch(/G\xe9n\xe9r\xe9 le/u);
  });
});

describe('historyXlsx', () => {
  it('produit un classeur zip lisible, notes en nombres', () => {
    const bytes = historyXlsx(view);
    expect(latin1(bytes.subarray(0, 2))).toBe('PK');
    const files = unzip(bytes);
    expect([...files.keys()]).toEqual(
      expect.arrayContaining([
        '[Content_Types].xml',
        '_rels/.rels',
        'xl/workbook.xml',
        'xl/_rels/workbook.xml.rels',
        'xl/worksheets/sheet1.xml',
      ]),
    );
    const sheet = files.get('xl/worksheets/sheet1.xml') ?? '';
    expect(sheet).toContain('<t>Performance</t>');
    expect(sheet).toContain('<c r="B3"><v>88</v></c>');
    expect(sheet).toContain('<c r="C3"><v>91</v></c>');
    expect(sheet).not.toContain('<v>NaN</v>');
    expect(files.get('xl/workbook.xml')).toContain('name="Historique"');
  });

  it('calcule le CRC32 standard', () => {
    const sample = new TextEncoder().encode('123456789');
    expect(crc32(sample)).toBe(0xcbf43926);
  });
});

describe('historyJson', () => {
  it('donne les audits datés, triés, notes numériques ou null', () => {
    const shuffled: HistoryView = {
      ...view,
      points: [...view.points].reverse(),
    };
    const text = historyJson(
      shuffled,
      'bon.audigy.test',
      new Date('2026-11-05T12:00:00Z'),
    );
    expect(text.endsWith('\n')).toBe(true);
    expect(JSON.parse(text)).toEqual({
      format: 'audixio-historique',
      version: 1,
      site: 'bon.audigy.test',
      generatedAt: '2026-11-05T12:00:00.000Z',
      series: [
        { id: 'global', label: 'Note globale' },
        { id: 'perf', label: 'Performance' },
      ],
      audits: [
        {
          id: 'a',
          at: '2026-01-12T10:00:00Z',
          scores: { global: 72, perf: null },
        },
        {
          id: 'b',
          at: '2026-05-03T10:00:00Z',
          scores: { global: 88, perf: 91 },
        },
      ],
    });
  });

  it('nomme le fichier en .json', () => {
    expect(historyFileName('bon.audigy.test', 'json')).toBe(
      'audixio-historique-bon.audigy.test.json',
    );
  });
});
