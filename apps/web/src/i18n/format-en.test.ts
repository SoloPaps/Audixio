import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  axisLabels,
  type HistoryPoint,
  historySummary,
  historyTable,
} from '../lib/history.js';
import { evolutionChart } from '../lib/history-chart.js';
import { formatDate, formatDateTime, formatNumber } from './format.js';
import { installPack } from './pack.js';

const pack = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const at = (iso: string) => Date.parse(iso) / 1000;
const points: HistoryPoint[] = [
  {
    id: 'a',
    href: '/rapport?id=a',
    at: '2026-10-15T08:00:00.000Z',
    scores: { global: 50 },
  },
  {
    id: 'b',
    href: '/rapport?id=b',
    at: '2026-11-04T10:13:00.000Z',
    scores: { global: 72 },
  },
];

describe('formats anglais (retest C4)', () => {
  beforeEach(() => installPack(pack));
  afterEach(() => installPack(null));

  it('dates et heures au format en-GB, sans « h » français', () => {
    const when = new Date('2026-11-04T10:13:00.000Z');
    expect(formatDate(when)).toBe('4 Nov 2026');
    expect(formatDateTime(when)).toBe('4 Nov 2026, 11:13');
  });

  it('nombres avec le point décimal anglais', () => {
    expect(formatNumber(1234.5)).toBe('1,234.5');
    const chart = evolutionChart([
      { label: 'a', value: 70 },
      { label: 'b', value: 74 },
    ]);
    expect(chart?.average).toBe('72.0');
  });

  it('historique : « since », abscisses et heures en anglais', () => {
    expect(historySummary(points, 'global')).toBe(
      pack['history.summary.up']
        ?.replace('{points}', '22')
        .replace('{date}', '15 October'),
    );
    expect(
      axisLabels([at('2026-10-15T08:00:00Z'), at('2026-11-04T10:13:00Z')]),
    ).toEqual(['15 Oct', '4 Nov']);
    expect(
      axisLabels([at('2026-11-04T08:00:00Z'), at('2026-11-04T10:13:00Z')]),
    ).toEqual(['09:00', '11:13']);
    expect(historyTable(points, []).rows[0]?.[0]?.text).toBe('15 Oct 2026');
  });

  it('période « 1 year » et colonne « Report no. »', () => {
    expect(pack['mq.hi.025']).toBe('1 year');
    expect(pack['mq.hi.087']).toBe('Report no.');
  });
});

describe('formats français inchangés sans dictionnaire anglais (C4)', () => {
  it('garde « 4 nov. 2026, 11 h 13 », « 72,0 » et « 15 oct. »', () => {
    expect(formatDateTime(new Date('2026-11-04T10:13:00.000Z'))).toBe(
      '4 nov. 2026, 11 h 13',
    );
    expect(
      evolutionChart([
        { label: 'a', value: 70 },
        { label: 'b', value: 74 },
      ])?.average,
    ).toBe('72,0');
    expect(
      axisLabels([at('2026-10-15T08:00:00Z'), at('2026-11-04T10:13:00Z')]),
    ).toEqual(['15 oct.', '4 nov.']);
  });
});
