import type { FindingView } from '@audigy/orchestrator';
import { describe, expect, it } from 'vitest';
import { briefEn } from '../i18n/brief-en.js';
import { briefFr } from '../i18n/brief-fr.js';
import { labelBriefFinding } from './brief-deps.js';
import { renderBriefMarkdown } from './brief-markdown.js';

const holes = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('brief en anglais', () => {
  it('chaque fragment anglais garde les paramètres du français', () => {
    for (const [key, fr] of Object.entries(briefFr)) {
      expect(holes(briefEn[key as keyof typeof briefEn]), key).toEqual(
        holes(fr),
      );
    }
  });

  it('le fichier rendu en anglais ne garde aucun titre français', () => {
    const items = [
      {
        checkId: 'performance.lcp',
        title: 'Slow first image',
        proof: 'The first image is heavy.',
        mode: 'fix' as const,
      },
    ];
    const base = {
      level: 'complet' as const,
      url: 'https://example.com',
      at: '2026-10-23T12:30:00.000Z',
      items,
    };
    const en = renderBriefMarkdown({ ...base, locale: 'en' });
    expect(en).toContain('Audixio Brief — complete (verified site)');
    expect(en).toContain('Role');
    expect(en).toContain('Findings');
    expect(en).toContain('Guardrails');
    expect(en).toContain('23 October 2026');
    expect(en).not.toMatch(
      /Rôle|Constats|Garde-fous|Contexte du site|Statut :/,
    );
    const fr = renderBriefMarkdown({ ...base, locale: 'fr' });
    expect(fr).toContain('Rôle');
    expect(fr).toContain('Garde-fous');
  });

  it('le libellé serveur d’un constat sort en anglais', () => {
    const finding: FindingView = {
      domain: 'seo',
      checkId: 'seo.description',
      status: 'warn',
      severity: 2,
      impact: 2,
      score: null,
      measured: {},
      messageKey: 'seo.description.warn_missing',
      params: {},
      fixKey: 'seo.description',
      effortMinutes: null,
      reason: null,
    };
    const en = labelBriefFinding(finding, 'en');
    const fr = labelBriefFinding(finding, 'fr');
    expect(en.title).not.toBe(fr.title);
    expect(
      labelBriefFinding({ ...finding, domain: 'securite' }, 'en').title,
    ).toBe('Finding noted on this site.');
  });
});
