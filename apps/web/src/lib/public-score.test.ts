import { describe, expect, it } from 'vitest';
import {
  badgeHasTracker,
  exampleRaw,
  exampleVerifiedView,
  exampleView,
  fromShareApi,
  payloadFromPublicView,
  presentRow,
  scoreBadgeSvg,
  shareIsOpen,
  toPublicScore,
} from './public-score.js';

const TRAP = 'fuite-hsts-mesure-secrete';

describe('score public', () => {
  it('masque le détail sécurité par défaut', () => {
    const view = exampleView();
    const dumped = JSON.stringify(view);
    expect(view.securityDetails).toEqual([]);
    expect(dumped).not.toContain(TRAP);
    expect(dumped).not.toContain('securite.hsts');
    expect(dumped).not.toContain('measured');
    expect(view.globalScore).toBe(65);
    expect(view.domains.map((row) => row.domain)).toEqual([
      'performance',
      'seo',
      'ecologie',
      'accessibilite',
      'qualite',
    ]);
    expect(view.methodVersion).toBe('2026.1');
    expect(view.auditId).toBe('00000000-0000-4000-8000-000000000019');
  });

  it('montre le détail seulement si le propriétaire l’a demandé', () => {
    const view = toPublicScore(exampleRaw(), { exposeSecurity: true });
    expect(view.securityDetails).toEqual([
      {
        checkId: 'securite.hsts',
        status: 'fail',
        messageKey: 'finding.securite.hsts',
      },
    ]);
    expect(JSON.stringify(view)).not.toContain(TRAP);
    expect(JSON.stringify(view)).not.toContain('measured');
  });

  it('ferme la note et les domaines sensibles sur le score servi', () => {
    const view = presentRow({
      site_label: 'Exemple',
      site_url: 'https://exemple.fr',
      finished_at: null,
      method_version: '2026.1',
      global_score: 72,
      audit_id: '00000000-0000-4000-8000-000000000019',
      expose_security: true,
      coverage: 1,
      report_id: null,
      domains: [
        { domain: 'performance', score: 80, level: 'good' },
        { domain: 'securite', score: 40, level: 'problem' },
        { domain: 'vie_privee', score: 10, level: 'problem' },
        { domain: 'dns_email', score: 20, level: 'problem' },
      ],
      security_details: [
        {
          check_id: 'securite.hsts',
          status: 'fail',
          message_key: 'finding.securite.hsts',
          measured: TRAP,
        },
      ],
    });
    const dumped = JSON.stringify(view);
    expect(view.globalScore).toBe(72);
    expect(view.securityDetails).toEqual([]);
    expect(view.domains.map((row) => row.domain)).toEqual(['performance']);
    expect(dumped).not.toContain(TRAP);
    expect(dumped).not.toContain('securite');
    expect(dumped).not.toContain('vie_privee');
    expect(dumped).not.toContain('dns_email');
  });

  it('sur un site vérifié, montre les constats sans recopier measured', () => {
    const view = presentRow({
      site_label: 'Exemple',
      site_url: 'https://exemple.fr',
      finished_at: null,
      method_version: '2026.1',
      global_score: 72,
      audit_id: '00000000-0000-4000-8000-000000000019',
      expose_security: false,
      coverage: 1,
      report_id: null,
      site_id: '00000000-0000-4000-8000-000000000010',
      site_verified: true,
      domains: [
        { domain: 'performance', score: 80, level: 'good' },
        { domain: 'securite', score: 40, level: 'problem' },
        { domain: 'vie_privee', score: 10, level: 'problem' },
        { domain: 'dns_email', score: 20, level: 'problem' },
      ],
      security_details: [],
      findings: [
        {
          domain: 'securite',
          check_id: 'securite.hsts',
          status: 'fail',
          severity: 4,
          impact: 3,
          message_key: 'finding.securite.hsts',
          fix_key: 'fix.securite.hsts',
          measured: TRAP,
        },
      ],
    });
    const dumped = JSON.stringify(view);
    expect(view.siteVerified).toBe(true);
    expect(view.domains.map((row) => row.domain)).toEqual([
      'performance',
      'securite',
      'vie_privee',
      'dns_email',
    ]);
    expect(view.findings).toEqual([
      {
        domain: 'securite',
        checkId: 'securite.hsts',
        status: 'fail',
        severity: 4,
        impact: 3,
        messageKey: 'finding.securite.hsts',
        fixKey: 'fix.securite.hsts',
      },
    ]);
    expect(dumped).not.toContain(TRAP);
    expect(dumped).not.toContain('measured');
    const payload = payloadFromPublicView(view);
    expect(JSON.stringify(payload.findings)).not.toContain(TRAP);
    const demo = exampleVerifiedView();
    expect(demo.siteVerified).toBe(true);
    expect(JSON.stringify(demo)).not.toContain(TRAP);
    expect(JSON.stringify(demo.findings)).not.toContain('measured');
  });

  it('révoque le lien dès que la date est posée', () => {
    const report = { visibility: 'link', revokedAt: null as string | null };
    expect(shareIsOpen(report)).toBe(true);
    report.revokedAt = new Date().toISOString();
    expect(shareIsOpen(report)).toBe(false);
    expect(shareIsOpen(null)).toBe(false);
    expect(shareIsOpen({ visibility: 'public', revokedAt: null })).toBe(false);
  });

  it('un lien public ou retiré ne garde pas une fuite du serveur', () => {
    const leaked = {
      access: 'public',
      brief: 'complet',
      label: 'Exemple',
      url: 'https://exemple.fr',
      noteGlobale: 72,
      briefTexte: 'Audixio Brief — COMPLET secret-brief',
      domaines: [
        { domain: 'seo', score: 80, verrouille: false },
        { domain: 'securite', score: 40, verrouille: true },
      ],
      constats: [
        {
          domain: 'securite',
          checkId: 'securite.hsts',
          status: 'fail',
          messageKey: 'finding.securite.hsts',
          measured: TRAP,
        },
      ],
    };
    const view = fromShareApi(leaked);
    const dumped = JSON.stringify(view);
    expect(view?.globalScore).toBe(72);
    expect(view?.securityDetails).toEqual([]);
    expect(view?.briefText).toBeNull();
    expect(view?.domains.map((row) => row.domain)).toEqual(['seo']);
    expect(dumped).not.toContain(TRAP);
    expect(dumped).not.toContain('secret-brief');
    expect(dumped).not.toContain('securite');
    const retired = fromShareApi({ ...leaked, access: 'retired' });
    expect(JSON.stringify(retired)).not.toContain(TRAP);
  });

  it('un lien équipe garde la note et le constat, pas la mesure brute', () => {
    const view = fromShareApi({
      access: 'team',
      brief: 'complet',
      label: 'Exemple',
      url: 'https://exemple.fr',
      noteGlobale: 72,
      briefTexte: 'brief équipe',
      domaines: [{ domain: 'securite', score: 40, verrouille: false }],
      constats: [
        {
          domain: 'securite',
          checkId: 'securite.hsts',
          status: 'fail',
          messageKey: 'finding.securite.hsts',
          measured: TRAP,
        },
      ],
    });
    expect(view?.globalScore).toBe(72);
    expect(view?.briefText).toBe('brief équipe');
    expect(view?.securityDetails).toEqual([
      {
        checkId: 'securite.hsts',
        status: 'fail',
        messageKey: 'finding.securite.hsts',
      },
    ]);
    expect(JSON.stringify(view)).not.toContain(TRAP);
  });

  it('fabrique un badge sans traceur', () => {
    const svg = scoreBadgeSvg('Exemple <script>', 72);
    expect(badgeHasTracker(svg)).toBe(false);
    expect(svg).not.toContain(TRAP);
    expect(svg).not.toContain('<script');
    expect(svg).toContain('&lt;script');
    expect(svg).toContain('72');
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)/);
  });
  it('repère tout lien externe dans un badge, quelle que soit la casse', () => {
    const svg = scoreBadgeSvg('Exemple', 72);
    expect(badgeHasTracker(svg)).toBe(false);
    for (const url of [
      'HTTPS://evil.example/p.gif',
      'http://www.w3.org.evil.example/p.gif',
      'https://evil.example/www.w3.org/',
      '//evil.example/p.gif',
    ])
      expect(
        badgeHasTracker(svg.replace('</svg>', `<image href="${url}"/></svg>`)),
      ).toBe(true);
  });
});
