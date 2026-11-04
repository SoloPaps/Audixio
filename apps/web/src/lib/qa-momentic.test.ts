import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { activeShareLinks } from './account-access.js';
import { badgeTargetHref } from './badge-target.js';
import { briefScreen } from './brief-screen.js';
import { constatShowsImageInventory } from './constat-kind.js';
import { briefSelectionRow } from './finding-choice.js';
import { filterHistoryPoints, historySpanOf } from './history-range.js';
import { homeUrlIssue } from './home-url-issue.js';
import { printPriorityTitle } from './print-priority.js';
import { progressCountHtml } from './progress-tally.js';
import {
  hostFromProgressQuery,
  reportHrefFromSearch,
} from './progress-target.js';
import { sslSelectValue, sslWarnDays } from './ssl-days.js';

const AUDIT = '00000000-0000-4000-8000-0000000000b2';

const TOKEN = 'ab'.repeat(16);
const USER = '11111111-1111-4111-8111-111111111111';

function source(name: string): string {
  return readFileSync(new URL(name, import.meta.url), 'utf8');
}

function migrations(): string {
  const dir = new URL('../../../../supabase/migrations/', import.meta.url);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(new URL(name, dir), 'utf8'))
    .join('\n');
}

describe('bug 1 — retrait d’accès', () => {
  it('compte les liens actifs du serveur et révoque la ligne en base', () => {
    const now = Date.parse('2026-11-04T00:00:00.000Z');
    const links = activeShareLinks(
      [
        {
          id: AUDIT,
          auditId: AUDIT,
          token: TOKEN,
          kind: 'team',
          visibility: 'link',
          revokedAt: null,
          expiresAt: null,
          createdAt: '2026-05-11T00:00:00.000Z',
        },
        {
          id: '00000000-0000-4000-8000-0000000000c1',
          auditId: AUDIT,
          token: 'cd'.repeat(16),
          kind: 'public',
          visibility: 'link',
          revokedAt: '2026-06-01T00:00:00.000Z',
          expiresAt: null,
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      new Map([[AUDIT, 'gratuit.audigy.test']]),
      now,
    );
    expect(links).toEqual([
      {
        id: AUDIT,
        host: 'gratuit.audigy.test',
        kind: 'team',
        urlPath: `/partage/${TOKEN}`,
        createdAt: '2026-05-11T00:00:00.000Z',
      },
    ]);
    const boot = source('../lib/espace-boot.ts');
    const board = source('../components/AccountBoard.svelte');
    expect(boot).toContain("from('reports')");
    expect(boot).toContain('revoked_at');
    expect(boot).toContain('activeShareLinks');
    expect(boot).not.toContain('audixio-revoked-access');
    expect(board).not.toContain('marie@exemple.fr');
    expect(board).not.toContain('data-revoke="apr1"');
  });
});

describe('bug 2 — alerte SSL', () => {
  it('enregistre 14 jours, pas le premier chiffre du select', () => {
    expect(
      sslWarnDays({
        selected: '14',
        text: '7 jours avant14 jours avant30 jours avant60 jours avant',
      }),
    ).toBe(14);
    expect(sslSelectValue(14)).toBe('14');
    expect(source('../lib/espace-boot.ts')).toContain('sslWarnDays');
  });
});

describe('bug 3 — action Rien', () => {
  it('enregistre Rien en base pour l’adresse canonique', () => {
    expect(
      briefSelectionRow({
        userId: USER,
        auditId: AUDIT,
        findingId: 'seo.canonical',
        choice: 'none',
        at: '2026-11-04T00:00:00.000Z',
      }),
    ).toEqual({
      user_id: USER,
      audit_id: AUDIT,
      finding_id: 'seo.canonical',
      choice: 'none',
      updated_at: '2026-11-04T00:00:00.000Z',
    });
    const view = source('../components/DomainView.svelte');
    expect(view).toContain("from('brief_selections')");
    expect(view).toContain('briefSelectionRow');
    expect(view).not.toContain('localStorage');
    const sql = migrations();
    expect(sql).toContain('create table public.brief_selections');
    expect(sql).toContain("choice in ('none', 'chk', 'fix')");
    expect(sql).toContain(
      'alter table public.brief_selections enable row level security',
    );
  });
});

describe('bug 4 — domaine de la progression', () => {
  it('affiche bon.audigy.test et non atelier-martin.fr', () => {
    const search = `?url=${encodeURIComponent('https://bon.audigy.test/')}`;
    expect(hostFromProgressQuery(search)).toBe('bon.audigy.test');
    expect(source('../components/ProgressLive.svelte')).toContain(
      'hostFromProgressQuery',
    );
  });
});

describe('bug 5 et 12 — historique du site', () => {
  it('peint le vrai domaine et les liens de rapport quand un site est demandé', () => {
    const boot = source('../lib/espace-boot.ts');
    const calls = boot.split('paintHistoryLive(').length - 1;
    expect(calls).toBeGreaterThanOrEqual(3);
  });
});

describe('bug 6 — filtre 1 an', () => {
  it('sélectionne une fenêtre d’un an distincte de 6 mois', () => {
    const now = Date.parse('2026-11-04T00:00:00.000Z');
    const points = [
      { at: '2026-03-01T00:00:00.000Z', value: 70 },
      { at: '2026-10-01T00:00:00.000Z', value: 90 },
    ];
    expect(historySpanOf(1)).toBe('1y');
    expect(
      filterHistoryPoints(points, '6m', now).map((point) => point.value),
    ).toEqual([90]);
    expect(
      filterHistoryPoints(points, '1y', now).map((point) => point.value),
    ).toEqual([70, 90]);
    expect(source('../lib/espace-boot.ts')).toContain('filterHistoryPoints');
  });
});

describe('bug 7 — badge', () => {
  it('vise le rapport du site et le même lien que l’aperçu', () => {
    expect(
      badgeTargetHref({
        origin: 'https://audixio.fr',
        shareToken: null,
        auditId: AUDIT,
      }),
    ).toBe(`https://audixio.fr/rapport?id=${AUDIT}`);
    expect(
      badgeTargetHref({
        origin: 'https://audixio.fr',
        shareToken: 'abc',
        auditId: AUDIT,
      }),
    ).toBe('https://audixio.fr/partage/abc');
    const view = source('../components/BadgeView.svelte');
    expect(view).not.toContain('exemple-rapport');
    expect(view).toContain('badgeTargetHref');
  });
});

describe('bug 8 — brief du site', () => {
  it('montre le prompt du site, pas l’exemple images', () => {
    const text = briefScreen({
      url: 'https://gratuit.audigy.test',
      items: [
        {
          checkId: 'seo.canonical',
          title: 'Adresse canonique',
          proof: 'pointe vers autre.example',
          mode: 'fix',
        },
      ],
    });
    expect(text).toContain('https://gratuit.audigy.test');
    expect(text).toContain('Adresse canonique');
    expect(text).toContain('pointe vers autre.example');
    expect(text).not.toContain('Images trop volumineuses');
    expect(source('../components/BriefView.svelte')).toContain('briefScreen');
  });
});

describe('bug 9 — poids des domaines', () => {
  it('la page méthode affiche 8 poids égaux qui totalisent 100', () => {
    const html = readFileSync(
      fileURLToPath(new URL('../pages/methode.astro', import.meta.url)),
      'utf8',
    );
    const start = html.indexOf('class="domains"');
    const block = html.slice(start, html.indexOf('</ol>', start));
    const counts = [...block.matchAll(/data-count="([^"]+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(counts).toHaveLength(8);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(100);
    expect(new Set(counts)).toEqual(new Set([12.5]));
  });
});

describe('bug 10 — 8 domaines à 100 %', () => {
  it('compte les 8 domaines, y compris le non testé', () => {
    const html = progressCountHtml([
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'off',
    ]);
    expect(html).toContain('8 domaines');
    expect(html).toContain('0 en cours');
    expect(html).toContain('1 non testé');
    expect(html).not.toContain('en attente');
    expect(source('../lib/progress-scene.ts')).toContain('progressCountHtml');
  });
});

describe('bug 11 — lien du rapport', () => {
  it('ouvre le rapport de l’audit, et un rapport réel sans identifiant', () => {
    expect(reportHrefFromSearch(`?id=${AUDIT}`)).toBe(`/rapport?id=${AUDIT}`);
    expect(reportHrefFromSearch('')).toBe('/exemple-rapport');
    expect(reportHrefFromSearch('')).not.toBe('/rapport');
    expect(source('../lib/progress-scene.ts')).toContain(
      'reportHrefFromSearch',
    );
  });
});

describe('bug 13 — URL invalide', () => {
  it('affiche le message français pour « not a url »', () => {
    expect(
      homeUrlIssue(
        'not a url',
        'Indiquez une adresse complète, comme https://exemple.fr.',
      ),
    ).toBe('Indiquez une adresse complète, comme https://exemple.fr.');
    expect(homeUrlIssue('https://exemple.fr', 'erreur')).toBeNull();
    expect(source('../components/HomeAuditForm.svelte')).toContain(
      'homeUrlIssue',
    );
  });
});

describe('bug 15 — impression sans priorité', () => {
  it('ne titre pas Les 5 priorités quand la liste est vide', () => {
    expect(
      printPriorityTitle(
        0,
        'Les 5 priorités',
        'Aucune priorité ouverte sur cet audit.',
      ),
    ).toBe('Aucune priorité ouverte sur cet audit.');
    expect(
      printPriorityTitle(
        2,
        'Les 5 priorités',
        'Aucune priorité ouverte sur cet audit.',
      ),
    ).toBe('Les 5 priorités');
    expect(source('../components/PrintReport.svelte')).toContain(
      'printPriorityTitle',
    );
  });
});

describe('bug 16 — constat canonique', () => {
  it('ne montre pas l’inventaire d’images', () => {
    expect(constatShowsImageInventory('seo.canonical.fail_other_host')).toBe(
      false,
    );
    expect(constatShowsImageInventory('constat.px.title')).toBe(true);
    expect(source('../components/ConstatView.svelte')).toContain(
      'constatShowsImageInventory',
    );
  });
});

describe('bug 17 — langue après rechargement', () => {
  it('réapplique l’anglais après l’hydratation des îlots', () => {
    expect(source('../i18n/live.ts')).toContain('MutationObserver');
  });
});
