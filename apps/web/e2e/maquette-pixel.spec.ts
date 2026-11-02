import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROOT = join(REPO, 'docs/design/maquettes/finales');
const FONTS = join(REPO, 'apps/web/src/styles/polices.css');
const OUT = existsSync('/opt/cursor/artifacts')
  ? '/opt/cursor/artifacts/pixel'
  : join(REPO, 'apps/web/test-results/pixel');
const MARKER = 'maquette-marker:audixio-finales-7f3c';
const MAX_RATIO = 0.3;
const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';
const SITE_ID = '00000000-0000-4000-8000-0000000000bb';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

const PAGES = [
  {
    id: 'hub',
    mock: `${ROOT}/page_rapport_hub/page_rapport_hub.html`,
    live: `/rapport?id=${AUDIT_ID}&theme=light`,
    ready: 'Audit de atelier-martin.fr',
  },
  {
    id: 'domaine',
    mock: `${ROOT}/page_rapport_domaine/page_rapport_domaine.html`,
    live: `/domaine?id=${AUDIT_ID}&domaine=performance&theme=light`,
    ready: 'Votre site est ralenti',
  },
  {
    id: 'restreint',
    mock: `${ROOT}/page_domaine_restreint/page_domaine_restreint.html`,
    live: `/domaine?id=${AUDIT_ID}&domaine=securite&theme=light`,
    ready: 'Sécurité',
  },
  {
    id: 'preuve',
    mock: `${ROOT}/page_verifier_propriete/page_verifier_propriete.html`,
    live: `/verifier?site=${SITE_ID}&theme=light`,
    ready: 'Vérifier la propriété',
  },
  {
    id: 'partager',
    mock: `${ROOT}/interface_partager/interface_partager.html`,
    live: `/rapport?id=${AUDIT_ID}&theme=light`,
    ready: 'Partager le rapport',
  },
] as const;

const WIDTHS = [1280, 330] as const;

function finding(input: {
  domain: string;
  checkId: string;
  status: string;
  severity: number;
  impact: number;
  messageKey: string;
  reason?: string;
  minutes: number;
}): unknown {
  return {
    domain: input.domain,
    checkId: input.checkId,
    status: input.status,
    severity: input.severity,
    impact: input.impact,
    score: input.status === 'pass' ? 100 : 0,
    measured: {},
    messageKey: input.messageKey,
    params: {},
    fixKey: null,
    effortMinutes: input.minutes,
    reason: input.reason ?? null,
  };
}

function audit(kind: 'hub' | 'domaine' | 'restreint'): unknown {
  const host = kind === 'restreint' ? 'exemple.fr' : 'atelier-martin.fr';
  const locked = kind === 'restreint';
  const domains = [
    ['performance', kind === 'domaine' ? 58 : 58],
    ['seo', 78],
    ['securite', locked ? null : 62],
    ['ecologie', 60],
    ['accessibilite', 81],
    ['qualite', 84],
    ['vie_privee', null],
    ['dns_email', 95],
  ] as const;
  const hubFindings = [
    finding({
      domain: 'performance',
      checkId: 'px.1',
      status: 'fail',
      severity: 4,
      impact: 3,
      messageKey: 'hub.px.t1',
      minutes: 15,
    }),
    finding({
      domain: 'seo',
      checkId: 'px.2',
      status: 'fail',
      severity: 3,
      impact: 3,
      messageKey: 'hub.px.t2',
      minutes: 30,
    }),
    finding({
      domain: 'securite',
      checkId: 'px.3',
      status: 'warn',
      severity: 3,
      impact: 3,
      messageKey: 'hub.px.t3',
      minutes: 20,
    }),
    finding({
      domain: 'accessibilite',
      checkId: 'px.4',
      status: 'warn',
      severity: 2,
      impact: 3,
      messageKey: 'hub.px.t4',
      minutes: 30,
    }),
    finding({
      domain: 'ecologie',
      checkId: 'px.5',
      status: 'warn',
      severity: 2,
      impact: 2,
      messageKey: 'hub.px.t5',
      minutes: 18,
    }),
    finding({
      domain: 'seo',
      checkId: 'px.6',
      status: 'warn',
      severity: 2,
      impact: 2,
      messageKey: 'hub.px.t6',
      minutes: 11,
    }),
    finding({
      domain: 'qualite',
      checkId: 'px.7',
      status: 'warn',
      severity: 2,
      impact: 2,
      messageKey: 'hub.px.t7',
      minutes: 33,
    }),
    finding({
      domain: 'accessibilite',
      checkId: 'px.8',
      status: 'warn',
      severity: 2,
      impact: 2,
      messageKey: 'hub.px.t8',
      minutes: 20,
    }),
    finding({
      domain: 'dns_email',
      checkId: 'px.9',
      status: 'warn',
      severity: 2,
      impact: 1,
      messageKey: 'hub.px.t9',
      minutes: 10,
    }),
    finding({
      domain: 'qualite',
      checkId: 'px.10',
      status: 'warn',
      severity: 1,
      impact: 2,
      messageKey: 'hub.px.t10',
      minutes: 20,
    }),
  ];
  const domainFindings = [1, 2, 3, 4, 5].map((n) =>
    finding({
      domain: 'performance',
      checkId: `dom.${n}`,
      status: n <= 2 ? 'fail' : n === 3 ? 'warn' : 'pass',
      severity: n <= 2 ? 4 : 2,
      impact: 2,
      messageKey: `domaine.px.t${n}`,
      reason: `domaine.px.w${n}`,
      minutes: 20,
    }),
  );
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: locked ? null : 74,
      siteVerified: !locked,
      partialLabel: locked ? 'partielle · 7 domaines · site non vérifié' : null,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: SITE_ID,
        url: `https://${host}`,
        label: host,
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: domains.map(([domain, score]) => ({
      domain,
      score,
      coverage: 1,
      level: score === null ? 'untested' : 'improve',
      locked: locked && domain === 'securite',
    })),
    findings: kind === 'domaine' ? domainFindings : locked ? [] : hubFindings,
  };
}

async function install(
  page: Page,
  kind: 'hub' | 'domaine' | 'restreint' | 'preuve' | 'partager',
): Promise<void> {
  const css = readFileSync(FONTS, 'utf8').replaceAll(
    'url(/fonts/',
    'url(http://127.0.0.1:4321/fonts/',
  );
  await page.route('https://fonts.googleapis.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/css', body: css });
  });
  await page.route('https://fonts.gstatic.com/**', async (route) => {
    await route.abort();
  });
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        user: session.user,
      }),
    });
  });
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    const bodyKind =
      kind === 'domaine'
        ? 'domaine'
        : kind === 'restreint'
          ? 'restreint'
          : 'hub';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(audit(bodyKind)),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: SITE_ID,
          url: 'https://exemple.fr',
          label: 'exemple.fr',
          host: 'exemple.fr',
          scope: 'origin',
          path_prefix: null,
        }),
      });
      return;
    }
    if (url.includes('site_verifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '00000000-0000-4000-8000-0000000000cc',
            method: 'meta',
            status: 'pending',
            token: 'abc123exemple',
            created_at: '2026-10-28T10:00:00.000Z',
          },
        ]),
      });
      return;
    }
    if (url.includes('/rest/v1/reports')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { share_token: 'k7Qm2xVa', visibility: 'link', revoked_at: null },
        ]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body:
        url.includes('action_plan') || url.includes('/audits') ? '[]' : 'null',
    });
  });
}

function parse(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

function pad(src: PNG, width: number, height: number): PNG {
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
  return out;
}

async function shoot(page: Page, url: string, width: number): Promise<Buffer> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scrollbar-width:none}' });
  return page.screenshot({
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  });
}

test.describe('maquettes finales, garde visuelle à 30 %', () => {
  for (const item of PAGES) {
    for (const width of WIDTHS) {
      test(`${item.id} ${width}px`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.emulateMedia({
          reducedMotion: 'reduce',
          colorScheme: 'light',
        });
        const leaks: string[] = [];
        page.on('request', (req) => {
          const url = req.url();
          if (
            !url.startsWith('http://127.0.0.1') &&
            !url.startsWith('http://localhost')
          )
            return;
          const ported = url.includes('/styles/maquettes/');
          if (
            url.includes('docs/design') ||
            url.includes('maquettes/finales') ||
            (url.includes('maquettes') && !ported)
          )
            leaks.push(url);
        });
        await install(page, item.id === 'partager' ? 'partager' : item.id);
        const mock = parse(await shoot(page, `file://${item.mock}`, width));
        leaks.length = 0;
        await page.setViewportSize({ width, height: 900 });
        await page.goto(item.live, { waitUntil: 'load' });
        if (item.id === 'partager') {
          await expect(
            page.getByRole('heading', { name: 'Audit de atelier-martin.fr' }),
          ).toBeVisible();
          await page.getByRole('link', { name: 'Partager' }).click();
        }
        await expect(
          page.getByRole('heading', { name: item.ready }).first(),
        ).toBeVisible();
        if (item.id === 'domaine') {
          await expect(page.getByText('près de 3 secondes')).toBeVisible();
          await expect(page.getByText('de fluidité ressentie')).toBeVisible();
          await expect(page.getByText('optimisations').first()).toBeVisible();
          await expect(page.getByText('Impact').first()).toBeVisible();
          await expect(page.getByText('Optimal').first()).toBeVisible();
          await expect(
            page.getByText('Fiche détaillée à venir').first(),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Sélection pour le prompt IA' }),
          ).toBeVisible();
          await expect(page.getByText('Pour chaque constat')).toBeVisible();
          await expect(
            page.getByRole('button', { name: 'Générer et copier le prompt' }),
          ).toBeVisible();
          await expect(
            page.getByText(
              'Le prompt est construit dans votre navigateur à partir de vos choix.',
            ),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', {
              name: 'Créez un compte pour débloquer ces outils',
            }),
          ).toBeVisible();
          await expect(
            page.getByRole('link', { name: 'Créer un compte gratuitement' }),
          ).toBeVisible();
          await expect(page.getByText('Infrastructure & e-mail')).toBeVisible();
        }
        if (item.id === 'restreint') {
          await expect(
            page.getByText('Réservé au propriétaire', { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText('Preuve de propriété', { exact: true }),
          ).toBeVisible();
          await expect(page.getByText('Choisir la méthode')).toBeVisible();
          await expect(page.getByText('Continuer avec Google')).toBeVisible();
          await expect(
            page.getByText('Vérifier la propriété du site'),
          ).toBeVisible();
          await expect(
            page.getByText('Consulter le guide pas à pas'),
          ).toBeVisible();
          await expect(
            page.getByText('Ce que la vérification débloque'),
          ).toBeVisible();
          await expect(
            page.getByRole('link', {
              name: 'Retour au rapport d’audit complet',
            }),
          ).toBeVisible();
          await expect(page.getByText(/HSTS|X-Frame|CSP/)).toHaveCount(0);
        }
        if (item.id === 'preuve') {
          await expect(page.getByText('Copier le snippet')).toBeVisible();
          await expect(
            page.getByText('Résultat simulé (aperçu)'),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Où en est la détection' }),
          ).toBeVisible();
          await expect(page.getByText('État initial')).toBeVisible();
          await expect(page.getByText('Échec soft')).toBeVisible();
          await expect(
            page.getByRole('heading', {
              name: 'Une preuve sans accès à votre serveur',
            }),
          ).toBeVisible();
        }
        const html = await page.content();
        expect(
          html,
          'marqueur de maquette présent dans l’application',
        ).not.toContain(MARKER);
        expect(leaks, `requête interdite : ${leaks.join(' ')}`).toEqual([]);
        await page.addStyleTag({ content: 'html{scrollbar-width:none}' });
        const liveBuffer = await page.screenshot({
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
        });
        const live = parse(liveBuffer);
        const w = Math.max(mock.width, live.width);
        const h = Math.max(mock.height, live.height);
        const a = pad(mock, w, h);
        const b = pad(live, w, h);
        const diff = new PNG({ width: w, height: h });
        const mismatched = pixelmatch(a.data, b.data, diff.data, w, h, {
          threshold: 0.1,
          includeAA: false,
        });
        const ratio = mismatched / (w * h);
        mkdirSync(OUT, { recursive: true });
        const stem = `${item.id}-${width}`;
        const mockPng = PNG.sync.write(a);
        const pagePng = PNG.sync.write(b);
        writeFileSync(`${OUT}/${stem}-maquette.png`, mockPng);
        writeFileSync(`${OUT}/${stem}-page.png`, pagePng);
        writeFileSync(`${OUT}/${stem}-diff.png`, PNG.sync.write(diff));
        const mockMd5 = createHash('md5').update(mockPng).digest('hex');
        const pageMd5 = createHash('md5').update(pagePng).digest('hex');
        writeFileSync(
          `${OUT}/${stem}.json`,
          JSON.stringify({
            ratio,
            percent: Number((ratio * 100).toFixed(4)),
            mockMd5,
            pageMd5,
            w,
            h,
          }),
        );
        expect(pageMd5, `${stem} md5 identiques`).not.toBe(mockMd5);
        expect(ratio, `${stem} : ${(ratio * 100).toFixed(2)} %`).toBeLessThan(
          MAX_RATIO,
        );
      });
    }
  }
});
