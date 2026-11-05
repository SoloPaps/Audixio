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
  {
    id: 'constat',
    mock: `${ROOT}/page_rapport_details/page_rapport_details.html`,
    live: `/constat?id=${AUDIT_ID}&check=constat.px&theme=light`,
    ready: 'Images trop volumineuses à l’ouverture',
  },
  {
    id: 'plan',
    mock: `${ROOT}/page_plan_action/page_plan_action.html`,
    live: `/plan?id=${AUDIT_ID}&theme=light`,
    ready: 'Plan d’action',
  },
  {
    id: 'brief',
    mock: `${ROOT}/page_brief_ia/page_brief_ia.html`,
    live: `/brief?id=${AUDIT_ID}&theme=light`,
    ready: 'Configuration de votre prompt IA',
  },
  {
    id: 'badge',
    mock: `${ROOT}/interface_badge_partage/interface_badge_partage.html`,
    live: `/badge?id=${AUDIT_ID}&theme=light`,
    ready: 'Afficher votre note sur votre site',
  },
  {
    id: 'accueil',
    mock: `${ROOT}/page_accueil/page_accueil.html`,
    live: '/?theme=light',
    ready: 'Vérifiez la santé',
  },
  {
    id: 'methode',
    mock: `${ROOT}/page_methode_bareme/page_methode_bareme.html`,
    live: '/methode?theme=light',
    ready: 'Comment Audixio mesure',
  },
  {
    id: 'exemple',
    mock: `${ROOT}/page_exemple_rapport/page_exemple_rapport.html`,
    live: '/exemple-rapport?theme=light',
    ready: 'Du rapport global',
  },
  {
    id: 'progression',
    mock: `${ROOT}/page_progression/page_progression.html`,
    live: '/progression?maquette=1&theme=light',
    ready: 'Avancement de l’audit',
  },
  {
    id: 'mentions',
    mock: `${ROOT}/page_mentions_legales/page_mentions_legales.html`,
    live: '/mentions-legales?theme=light',
    ready: 'Mentions légales',
  },
  {
    id: 'cgu',
    mock: `${ROOT}/page_conditions_utilisation/page_conditions_utilisation.html`,
    live: '/cgu?theme=light',
    ready: 'Conditions d’utilisation',
  },
  {
    id: 'confidentialite',
    mock: `${ROOT}/page_politique_confidentialite/page_politique_confidentialite.html`,
    live: '/confidentialite?theme=light',
    ready: 'Politique de confidentialité',
  },
  {
    id: 'accessibilite',
    mock: `${ROOT}/page_accessibilite/page_accessibilite.html`,
    live: '/accessibilite?theme=light',
    ready: 'Déclaration d’accessibilité',
  },
  {
    id: 'ecologie',
    mock: `${ROOT}/page_ecologie/page_ecologie.html`,
    live: '/ecoconception?theme=light',
    ready: 'Questionnaire éco-conception',
  },
  {
    id: 'robot',
    mock: `${ROOT}/page_robot_audixio/page_robot_audixio.html`,
    live: '/robot?theme=light',
    ready: 'Robot Audixio',
  },
  {
    id: 'e404',
    mock: `${ROOT}/page_404/page_404.html`,
    live: '/404?theme=light',
    ready: 'évaporée',
  },
  {
    id: 'e500',
    mock: `${ROOT}/page_500/page_500.html`,
    live: '/500?theme=light',
    ready: 'perdu',
  },
  {
    id: 'maintenance',
    mock: `${ROOT}/page_maintenance/page_maintenance.html`,
    live: '/maintenance?theme=light',
    ready: 'peaufine',
  },
  {
    id: 'cookies',
    mock: `${ROOT}/interface_bandeau_cookies/interface_bandeau_cookies.html`,
    live: '/cookies?theme=light',
    ready: 'Vos choix sur les cookies',
  },
  {
    id: 'audit',
    mock: `${ROOT}/page_audit_echoue/page_audit_echoue.html`,
    live: '/audit-echoue?maquette=1&theme=light',
    ready: 'n’a pas abouti',
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

function pdfAudit(): unknown {
  const row = (
    domain: string,
    checkId: string,
    status: string,
    severity: number,
    impact: number,
    messageKey: string,
    reason?: string,
  ) =>
    finding({
      domain,
      checkId,
      status,
      severity,
      impact,
      messageKey,
      minutes: 15,
      ...(reason ? { reason } : {}),
    });
  const fills = (domain: string, count: number): ReturnType<typeof finding>[] =>
    Array.from({ length: count }, (_, index) =>
      row(domain, `${domain}.fill.${index}`, 'fail', 1, 0, 'pdf.px.t2'),
    );
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 84,
      siteVerified: true,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: SITE_ID,
        url: 'https://atelier-martin.fr',
        label: 'atelier-martin.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      ['securite', 84],
      ['performance', 68],
      ['accessibilite', 82],
      ['seo', 95],
      ['vie_privee', 55],
      ['ecologie', 66],
      ['qualite', 85],
      ['dns_email', 96],
    ].map(([domain, score]) => ({
      domain,
      score,
      coverage: 1,
      level: 'improve',
      locked: false,
    })),
    findings: [
      row('vie_privee', 'px.1', 'fail', 4, 3, 'pdf.px.t1', 'pdf.px.d1'),
      row('securite', 'px.2', 'fail', 3, 3, 'pdf.px.t2', 'pdf.px.d2'),
      row('performance', 'px.3', 'fail', 3, 2, 'pdf.px.t3', 'pdf.px.d3'),
      row('accessibilite', 'px.4', 'warn', 2, 2, 'pdf.px.t4', 'pdf.px.d4'),
      row('ecologie', 'px.5', 'warn', 1, 2, 'pdf.px.t5', 'pdf.px.d5'),
      row('securite', 'securite.constat', 'warn', 1, 1, 'pdf.px.note.securite'),
      row(
        'performance',
        'performance.constat',
        'warn',
        1,
        1,
        'pdf.px.note.performance',
      ),
      row(
        'accessibilite',
        'accessibilite.constat',
        'warn',
        1,
        1,
        'pdf.px.note.accessibilite',
      ),
      row('seo', 'seo.constat', 'pass', 1, 1, 'pdf.px.note.seo'),
      row(
        'vie_privee',
        'vie_privee.constat',
        'warn',
        1,
        1,
        'pdf.px.note.vie_privee',
      ),
      row('ecologie', 'ecologie.constat', 'warn', 1, 1, 'pdf.px.note.ecologie'),
      row('qualite', 'qualite.constat', 'pass', 1, 1, 'pdf.px.note.qualite'),
      row(
        'dns_email',
        'dns_email.constat',
        'pass',
        1,
        1,
        'pdf.px.note.dns_email',
      ),
      ...fills('securite', 3),
      ...fills('performance', 2),
      ...fills('accessibilite', 2),
      ...fills('vie_privee', 1),
      ...fills('ecologie', 1),
    ],
  };
}

function audit(
  kind:
    | 'hub'
    | 'domaine'
    | 'restreint'
    | 'constat'
    | 'plan'
    | 'brief'
    | 'badge',
): unknown {
  const host = kind === 'restreint' ? 'exemple.fr' : 'atelier-martin.fr';
  const locked = kind === 'restreint';
  const domains = [
    ['performance', kind === 'brief' ? 52 : 58],
    ['seo', kind === 'brief' ? 78 : 78],
    ['securite', locked ? null : kind === 'brief' ? 45 : 62],
    ['ecologie', kind === 'brief' ? 58 : 60],
    ['accessibilite', 81],
    ['qualite', kind === 'brief' ? 92 : 84],
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
      globalScore: locked ? null : kind === 'badge' ? 82 : 74,
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
    findings:
      kind === 'domaine'
        ? domainFindings
        : kind === 'constat'
          ? [
              finding({
                domain: 'performance',
                checkId: 'constat.prev',
                status: 'fail',
                severity: 3,
                impact: 2,
                messageKey: 'constat.px.prev',
                minutes: 20,
              }),
              finding({
                domain: 'performance',
                checkId: 'constat.px',
                status: 'fail',
                severity: 4,
                impact: 3,
                messageKey: 'constat.px.title',
                reason: 'constat.px.lede',
                minutes: 20,
              }),
              finding({
                domain: 'performance',
                checkId: 'constat.next',
                status: 'warn',
                severity: 2,
                impact: 2,
                messageKey: 'constat.px.next',
                minutes: 20,
              }),
            ]
          : kind === 'plan'
            ? [1, 2, 3, 4, 5, 6, 7].map((n) =>
                finding({
                  domain:
                    n === 1
                      ? 'vie_privee'
                      : n === 2 || n === 5
                        ? 'securite'
                        : n === 3
                          ? 'performance'
                          : n === 6
                            ? 'ecologie'
                            : 'accessibilite',
                  checkId: `plan.${n}`,
                  status: n === 4 || n === 6 || n === 7 ? 'warn' : 'fail',
                  severity: n === 1 ? 4 : n === 6 ? 2 : 3,
                  impact: n === 1 || n === 2 ? 3 : n === 5 || n === 6 ? 1 : 2,
                  messageKey: `plan.px.t${n}`,
                  reason: `plan.px.w${n}`,
                  minutes: n === 2 ? 40 : 15,
                }),
              )
            : kind === 'brief'
              ? (
                  [
                    ['performance', 'fail', 4, 1],
                    ['performance', 'warn', 3, 2],
                    ['performance', 'pass', 2, 3],
                    ['seo', 'fail', 3, 4],
                    ['seo', 'warn', 2, 5],
                    ['securite', 'fail', 4, 6],
                    ['securite', 'fail', 3, 7],
                    ['securite', 'pass', 2, 8],
                    ['ecologie', 'fail', 3, 9],
                    ['ecologie', 'warn', 2, 10],
                    ['accessibilite', 'fail', 4, 11],
                    ['accessibilite', 'warn', 3, 12],
                    ['qualite', 'fail', 2, 13],
                    ['dns_email', 'warn', 2, 14],
                  ] as const
                ).map(([domain, status, severity, n]) =>
                  finding({
                    domain,
                    checkId: `brief.${n}`,
                    status,
                    severity,
                    impact: 2,
                    messageKey: `brief.px.t${n}`,
                    reason: `brief.px.d${n}`,
                    minutes: 20,
                  }),
                )
              : locked
                ? []
                : hubFindings,
  };
}

type PixelKind =
  | 'hub'
  | 'domaine'
  | 'restreint'
  | 'preuve'
  | 'partager'
  | 'constat'
  | 'plan'
  | 'brief'
  | 'badge'
  | 'accueil'
  | 'methode'
  | 'exemple'
  | 'progression'
  | 'sites-vide'
  | 'sites-liste'
  | 'historique'
  | 'compte'
  | 'alertes'
  | 'bienvenue'
  | 'pdf';

function sessionFor(kind: PixelKind) {
  if (kind === 'compte') {
    return {
      ...session,
      user: { ...session.user, email: 'alexis95120@gmail.com' },
    };
  }
  if (kind === 'alertes') {
    return {
      ...session,
      user: { ...session.user, email: 'camille@exemple.fr' },
    };
  }
  if (kind === 'bienvenue') {
    return {
      ...session,
      user: {
        ...session.user,
        email: 'camille@exemple.fr',
        user_metadata: { full_name: 'Camille' },
      },
    };
  }
  return session;
}

async function install(page: Page, kind: PixelKind): Promise<void> {
  const active = sessionFor(kind);
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
        access_token: active.access_token,
        expires_at: active.expires_at,
        expires_in: active.expires_in,
        user: active.user,
      }),
    });
  });
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(active.user),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    const bodyKind =
      kind === 'domaine' ||
      kind === 'restreint' ||
      kind === 'constat' ||
      kind === 'plan' ||
      kind === 'brief' ||
      kind === 'badge'
        ? kind
        : 'hub';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(kind === 'pdf' ? pdfAudit() : audit(bodyKind)),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      const listed =
        kind === 'sites-liste'
          ? [
              {
                id: SITE_ID,
                url: 'https://monsite-exemple.fr',
                label: 'monsite-exemple.fr',
                host: 'monsite-exemple.fr',
                owner_id: session.user.id,
                is_public: true,
                public_slug: 'exemple',
                expose_security: false,
              },
              {
                id: '00000000-0000-4000-8000-0000000000cc',
                url: 'https://boutique.exemple.fr',
                label: 'boutique.exemple.fr',
                host: 'boutique.exemple.fr',
                owner_id: session.user.id,
                is_public: false,
                public_slug: null,
                expose_security: false,
              },
            ]
          : kind === 'sites-vide'
            ? []
            : {
                id: SITE_ID,
                url: 'https://exemple.fr',
                label: 'exemple.fr',
                host: 'exemple.fr',
                scope: 'origin',
                path_prefix: null,
              };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(listed),
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
    const planItems =
      kind === 'plan'
        ? [
            { check_id: 'plan.2', status: 'doing' },
            { check_id: 'plan.4', status: 'done' },
            { check_id: 'plan.7', status: 'doing' },
          ]
        : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: url.includes('action_plan')
        ? JSON.stringify(planItems)
        : url.includes('/audits')
          ? '[]'
          : 'null',
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

async function shoot(
  page: Page,
  url: string,
  width: number,
  prep?: (page: Page) => Promise<void>,
): Promise<Buffer> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'load' });
  if (prep) await prep(page);
  await page.addStyleTag({ content: 'html{scrollbar-width:none}' });
  return page.screenshot({
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  });
}

function sideBySide(left: PNG, right: PNG): PNG {
  const gap = 24;
  const width = left.width + gap + right.width;
  const height = Math.max(left.height, right.height);
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(left, out, 0, 0, left.width, left.height, 0, 0);
  PNG.bitblt(right, out, 0, 0, right.width, right.height, left.width + gap, 0);
  return out;
}

async function stripDemo(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = globalThis as unknown as {
      document: {
        querySelector: (selector: string) => { remove: () => void } | null;
      };
    };
    root.document.querySelector('.backdrop iframe')?.remove();
    root.document.querySelector('.seg-wrap')?.remove();
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
        await install(
          page,
          item.id === 'accueil' ||
            item.id === 'methode' ||
            item.id === 'exemple' ||
            item.id === 'progression' ||
            item.id === 'mentions' ||
            item.id === 'cgu' ||
            item.id === 'confidentialite' ||
            item.id === 'accessibilite' ||
            item.id === 'ecologie' ||
            item.id === 'robot' ||
            item.id === 'e404' ||
            item.id === 'e500' ||
            item.id === 'maintenance' ||
            item.id === 'cookies' ||
            item.id === 'audit'
            ? 'hub'
            : item.id === 'partager'
              ? 'partager'
              : item.id,
        );
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
        if (item.id === 'constat') {
          await expect(page.getByText('Simulateur').first()).toBeVisible();
          await expect(
            page.getByRole('heading', {
              name: 'Ce que vos visiteurs ressentent vraiment',
            }),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Liste des images à optimiser' }),
          ).toBeVisible();
          await expect(page.getByText('hero-banner-atelier.jpg')).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Plan d’action en 3 étapes' }),
          ).toBeVisible();
          await expect(page.getByText('Avec mon CMS')).toBeVisible();
          await expect(page.getByText('Avec du code')).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Consigne IA prête à l’emploi' }),
          ).toBeVisible();
          await expect(
            page.getByRole('link', { name: 'Ouvrir le brief IA' }),
          ).toBeVisible();
          await expect(
            page.getByText('Scripts JavaScript non différés'),
          ).toBeVisible();
          await expect(
            page.getByText('Polices web non préchargées'),
          ).toBeVisible();
        }
        if (item.id === 'plan') {
          await expect(
            page.getByRole('heading', { name: 'Où commencer' }),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Gains rapides' }),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Tâches' }),
          ).toBeVisible();
          await expect(
            page.getByText('Supprimer les traceurs déposés avant consentement'),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', { name: 'Aller plus loin' }),
          ).toBeVisible();
          await expect(
            page.getByRole('link', { name: 'Brief IA' }),
          ).toBeVisible();
          await expect(
            page.getByRole('link', { name: 'Télécharger en Markdown' }),
          ).toBeVisible();
        }
        if (item.id === 'brief') {
          await expect(
            page.getByRole('heading', { name: 'Domaines d’audit (8)' }),
          ).toBeVisible();
          await expect(
            page.getByText('Images trop volumineuses à l’ouverture').first(),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', {
              name: 'Rendu du prompt prêt pour votre assistant',
            }),
          ).toBeVisible();
          await expect(
            page.getByText('audixio-prompt-remediation.md').first(),
          ).toBeVisible();
          await expect(
            page.getByRole('button', {
              name: 'Copier le prompt pour votre assistant IA',
            }),
          ).toBeVisible();
          await expect(page.getByText('Lancer le test')).toBeVisible();
          await expect(page.getByText('Verrouillé')).toHaveCount(0);
        }
        if (item.id === 'badge') {
          await expect(page.getByText('Style du badge')).toBeVisible();
          await expect(
            page.getByText('Complet', { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText('Compact', { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText('Pastille', { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText('Code à coller dans votre site'),
          ).toBeVisible();
          await expect(page.getByText('Lien public du rapport')).toBeVisible();
          await expect(
            page.getByRole('link', { name: 'Retour au rapport' }),
          ).toBeVisible();
          await expect(page.getByText('note B')).toBeVisible();
        }
        if (item.id === 'preuve') {
          await expect(page.getByText('Copier le snippet')).toBeVisible();
          await expect(page.getByText('Résultat simulé (aperçu)')).toHaveCount(
            0,
          );
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
        if (item.id === 'accueil') {
          for (const name of [
            'Ce que vous obtenez',
            'Questions fréquentes',
            'Explorer Audixio',
            'Prêt à évaluer la santé de votre site ?',
            'Les 8 domaines Audixio',
            'Trois étapes, aucune inscription',
          ]) {
            await expect(
              page.getByRole('heading', { name }).first(),
            ).toBeVisible();
          }
          await expect(page.locator('#bg-canvas')).toBeVisible();
          await expect(page.locator('#ecg')).toBeVisible();
          await expect(page.locator('#audit-form')).toBeVisible();
        }
        if (item.id === 'methode') {
          for (const name of [
            'Un audit passif en 3 étapes',
            'Ce que signifie chaque note',
            'Ce que nous ne faisons jamais',
            'Les 8 domaines analysés et leur poids',
            'La formule, et pourquoi elle est reproductible',
            'Questions fréquentes',
          ]) {
            await expect(
              page.getByRole('heading', { name }).first(),
            ).toBeVisible();
          }
        }
        if (item.id === 'exemple') {
          for (const name of [
            'Le rapport : tout votre site d’un coup d’œil',
            'Le domaine : Performance en détail',
            'Le constat : du problème au correctif',
            'Recevez ce parcours pour votre propre site',
          ]) {
            await expect(
              page.getByRole('heading', { name }).first(),
            ).toBeVisible();
          }
          await expect(page.locator('#rose')).toBeVisible();
          await expect(page.locator('#net')).toBeVisible();
        }
        if (item.id === 'progression') {
          await expect(page.locator('#notify')).toHaveCount(1);
          await expect(
            page.getByRole('heading', { name: 'Périmètres sous examen' }),
          ).toBeVisible();
          await expect(page.locator('#pbar')).toBeVisible();
          await expect(page.locator('#stage')).toBeVisible();
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

const ESPACE = [
  {
    id: 'sites-vide',
    kind: 'sites-vide' as const,
    mock: `${ROOT}/page_sites_suivis_vide/page_sites_suivis_vide.html`,
    live: '/sites?theme=light',
    ready: 'Suivez votre premier site',
    sections: ['Comment ça marche', 'Pour aller plus loin'],
  },
  {
    id: 'sites-liste',
    kind: 'sites-liste' as const,
    mock: `${ROOT}/page_site_suivi/page_site_suivi.html`,
    live: '/sites?theme=light',
    ready: 'Sites suivis',
    sections: [
      'Domaines sous surveillance',
      'Pourquoi surveiller vos domaines',
      'Calcul souverain & normes',
      'Allez plus loin dans le suivi',
    ],
  },
  {
    id: 'historique',
    kind: 'historique' as const,
    mock: `${ROOT}/pages_historique_monsite/pages_historique_monsite.html`,
    live: '/historique?theme=light',
    ready: 'monsite-exemple.fr',
    sections: ['Évolution de la note globale', 'Les 8 domaines audités'],
  },
  {
    id: 'compte',
    kind: 'compte' as const,
    mock: `${ROOT}/page_compte/page_compte.html`,
    live: '/compte?theme=light',
    ready: 'Votre compte',
    sections: ['Google Search Console', 'Accès partagés'],
  },
  {
    id: 'alertes',
    kind: 'alertes' as const,
    mock: `${ROOT}/page_reglages_alertes/page_reglages_alertes.html`,
    live: '/compte/alertes?theme=light',
    ready: 'Réglages des alertes',
    sections: ['Alertes incluses', 'Alertes sur mesure'],
    prep: stripDemo,
  },
  {
    id: 'bienvenue',
    kind: 'bienvenue' as const,
    mock: `${ROOT}/page_bienvenue/page_bienvenue.html`,
    live: '/bienvenue?theme=light',
    ready: 'Bienvenue sur Audixio',
    sections: ['Checklist de démarrage', 'Comprendre avant de commencer'],
  },
] as const;

test.describe('espace connecté, garde visuelle à 30 %', () => {
  for (const item of ESPACE) {
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
        await install(page, item.kind);
        const prep = 'prep' in item ? item.prep : undefined;
        const mock = parse(
          await shoot(page, `file://${item.mock}`, width, prep),
        );
        leaks.length = 0;
        await page.setViewportSize({ width, height: 900 });
        await page.goto(item.live, { waitUntil: 'load' });
        await expect(
          page.getByRole('heading', { name: item.ready }).first(),
        ).toBeVisible();
        for (const name of item.sections) {
          await expect(
            page.getByRole('heading', { name }).first(),
          ).toBeVisible();
        }
        if (item.id === 'bienvenue') {
          await expect(
            page.getByText('Pour aller plus loin').first(),
          ).toBeVisible();
        }
        const html = await page.content();
        expect(html).not.toContain(MARKER);
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
        writeFileSync(`${OUT}/${stem}-maquette.png`, PNG.sync.write(a));
        writeFileSync(`${OUT}/${stem}-page.png`, PNG.sync.write(b));
        writeFileSync(`${OUT}/${stem}-diff.png`, PNG.sync.write(diff));
        const side = PNG.sync.write(sideBySide(a, b));
        writeFileSync(`${OUT}/${stem}-cote-a-cote.png`, side);
        writeFileSync(`/opt/cursor/artifacts/${stem}-cote-a-cote.png`, side);
        const mockMd5 = createHash('md5')
          .update(PNG.sync.write(a))
          .digest('hex');
        const pageMd5 = createHash('md5')
          .update(PNG.sync.write(b))
          .digest('hex');
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

const AUTH = [
  {
    id: 'connexion',
    mock: `${ROOT}/interface_connexion/interface_connexion.html`,
    live: '/connexion?theme=light',
    ready: 'Connexion',
    prep: stripDemo,
    check: async (page: Page) => {
      await expect(
        page.getByRole('link', { name: 'Fermer et revenir à l’accueil' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Se connecter' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Créer un compte' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Continuer avec Google' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Continuer avec GitHub' }),
      ).toBeVisible();
      await expect(page.getByText('ou avec votre e-mail')).toBeVisible();
      await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
      await expect(page.getByLabel('Mot de passe')).toBeVisible();
      await expect(page.getByText('Rester connecté')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Mot de passe oublié ?' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Se connecter' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'CGU' })).toBeVisible();
      await expect(page.getByText('Aucun traceur.')).toBeVisible();
    },
  },
  {
    id: 'inscription',
    mock: `${ROOT}/interface_connexion/interface_connexion.html`,
    live: '/inscription?theme=light',
    ready: 'Créer un compte',
    prep: async (page: Page) => {
      await page.getByRole('tab', { name: 'Créer un compte' }).click();
      await page.waitForFunction(
        "document.querySelector('#v-signup')?.classList.contains('vin')",
      );
      await stripDemo(page);
    },
    check: async (page: Page) => {
      await expect(
        page.getByRole('link', { name: 'Continuer avec Google' }),
      ).toBeVisible();
      await expect(page.getByText('ou avec votre e-mail')).toBeVisible();
      await expect(page.getByText('Saisissez un mot de passe')).toBeVisible();
      await expect(page.getByRole('checkbox')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'politique de confidentialité' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Créer mon compte' }),
      ).toBeVisible();
    },
  },
  {
    id: 'lien',
    mock: `${ROOT}/interface_connexion/interface_connexion.html`,
    live: '/connexion?erreur=lien&theme=light',
    ready: 'Connexion',
    prep: stripDemo,
    check: async (page: Page) => {
      await expect(
        page.getByText('Ce lien n’est plus valable. Demandez-en un nouveau.'),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Renvoyer le lien' }),
      ).toBeVisible();
      await expect(
        page.getByText(
          'Le lien a expiré. Indiquez votre adresse pour en recevoir un nouveau.',
        ),
      ).toBeVisible();
    },
  },
  {
    id: 'reinitialisation',
    mock: `${ROOT}/page_reinitialisation_mot_de_passe/page_reinitialisation_mot_de_passe.html`,
    live: '/reinitialisation?theme=light',
    ready: 'Mot de passe oublié ?',
    prep: stripDemo,
    check: async (page: Page) => {
      await expect(
        page.getByRole('navigation', { name: 'Fil d’Ariane' }),
      ).toBeVisible();
      await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Recevoir le lien' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Besoin d’aide ?' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /Retour à la connexion/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /Contacter l’équipe/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /Sécurité et confidentialité/ }),
      ).toBeVisible();
    },
  },
  {
    id: 'nouveau-mot-de-passe',
    mock: `${ROOT}/page_reinitialisation_mot_de_passe/page_reinitialisation_mot_de_passe.html`,
    live: '/reinitialisation?etape=nouveau&theme=light',
    ready: 'Choisissez un nouveau mot de passe',
    prep: async (page: Page) => {
      await page
        .getByRole('button', { name: '2. Nouveau mot de passe' })
        .click();
      await page.locator('[data-view="nouveau"]').waitFor({ state: 'visible' });
      await stripDemo(page);
    },
    check: async (page: Page) => {
      await expect(
        page.getByRole('textbox', { name: 'Nouveau mot de passe' }),
      ).toBeVisible();
      await expect(
        page.getByRole('textbox', { name: 'Confirmer le mot de passe' }),
      ).toBeVisible();
      await expect(
        page.getByText('10 caractères minimum').first(),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Enregistrer le mot de passe' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Besoin d’aide ?' }),
      ).toBeVisible();
    },
  },
  {
    id: 'email-confirme',
    mock: `${ROOT}/page_email_confirme/page_email_confirme.html`,
    live: '/email-confirme?theme=light',
    ready: 'Adresse e-mail confirmée',
    prep: async (page: Page) => {
      await stripDemo(page);
    },
    check: async (page: Page) => {
      await expect(page.getByText('Compte activé')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Lancer mon premier audit' }),
      ).toHaveAttribute('href', '/#audit-form');
      await expect(
        page.getByRole('link', { name: 'Découvrir Audixio' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Et ensuite ?' }),
      ).toBeVisible();
      await expect(
        page.getByText('Trois façons de bien démarrer.'),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /Mes sites suivis/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /Mon compte/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /La méthode/ }),
      ).toBeVisible();
    },
  },
] as const;

test.describe('maquettes auth, garde visuelle à 30 %', () => {
  for (const item of AUTH) {
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
        await install(page, 'hub');
        const mock = parse(
          await shoot(page, `file://${item.mock}`, width, item.prep),
        );
        leaks.length = 0;
        await page.setViewportSize({ width, height: 900 });
        await page.goto(item.live, { waitUntil: 'load' });
        await expect(
          page.getByRole('heading', { name: item.ready }).first(),
        ).toBeVisible();
        await item.check(page);
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
        writeFileSync(`${OUT}/${stem}-maquette.png`, PNG.sync.write(a));
        writeFileSync(`${OUT}/${stem}-page.png`, PNG.sync.write(b));
        writeFileSync(`${OUT}/${stem}-diff.png`, PNG.sync.write(diff));
        writeFileSync(
          `${OUT}/${stem}-cote-a-cote.png`,
          PNG.sync.write(sideBySide(a, b)),
        );
        const mockMd5 = createHash('md5')
          .update(PNG.sync.write(a))
          .digest('hex');
        const pageMd5 = createHash('md5')
          .update(PNG.sync.write(b))
          .digest('hex');
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

const GATES = [
  {
    id: 'pro',
    mock: `${ROOT}/page_pro/page_pro.html`,
    live: '/pro?theme=light',
    ready: 'bientôt disponible',
    sections: ['Les fonctionnalités', 'Gratuit ou Pro', 'entièrement gratuite'],
  },
  {
    id: 'passer',
    mock: `${ROOT}/interface_passer_pro/interface_passer_pro.html`,
    /* Question 1 : /passer-pro renvoie vers /pro ; la même fenêtre Pro vit sur /sites. */
    live: '/sites?theme=light',
    kind: 'sites-liste',
    ready: 'limite du plan gratuit',
    sections: ['Ce que Pro débloquera'],
    prep: async (page: Page) => {
      if (!(await page.locator('#pro-modal.on').count())) {
        await page.locator('[data-pro]').first().click();
      }
      await page.waitForSelector('#pro-modal.on');
    },
  },
  {
    id: 'demande',
    mock: `${ROOT}/page_demande_acces/page_demande_acces.html`,
    live: '/demande-acces?theme=light',
    ready: 'au propriétaire',
    sections: ['Souveraineté et vérification', 'Ce que la demande accorde'],
  },
  {
    id: 'acces',
    mock: `${ROOT}/page_acceptation_acces/page_acceptation_acces.html`,
    live: '/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light',
    ready: 'votre rapport',
    sections: ['Votre décision', 'En résumé', 'Sécurité & contrôle'],
  },
] as const;

test.describe('portes Pro et accès, garde visuelle à 30 %', () => {
  for (const item of GATES) {
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
        await install(page, 'kind' in item ? item.kind : 'hub');
        const prep = 'prep' in item ? item.prep : undefined;
        const mock = parse(
          await shoot(page, `file://${item.mock}`, width, prep),
        );
        leaks.length = 0;
        await page.setViewportSize({ width, height: 900 });
        await page.goto(item.live, { waitUntil: 'load' });
        if (prep) await prep(page);
        await expect(
          page.getByRole('heading', { name: item.ready }).first(),
        ).toBeVisible();
        for (const name of item.sections) {
          await expect(
            page.getByRole('heading', { name }).first(),
          ).toBeVisible();
        }
        const html = await page.content();
        expect(html).not.toContain(MARKER);
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
        mkdirSync('/opt/cursor/artifacts', { recursive: true });
        const stem = `${item.id}-${width}`;
        writeFileSync(`${OUT}/${stem}-maquette.png`, PNG.sync.write(a));
        writeFileSync(`${OUT}/${stem}-page.png`, PNG.sync.write(b));
        writeFileSync(`${OUT}/${stem}-diff.png`, PNG.sync.write(diff));
        const side = PNG.sync.write(sideBySide(a, b));
        writeFileSync(`${OUT}/${stem}-cote-a-cote.png`, side);
        writeFileSync(`/opt/cursor/artifacts/${stem}-cote-a-cote.png`, side);
        const mockMd5 = createHash('md5')
          .update(PNG.sync.write(a))
          .digest('hex');
        const pageMd5 = createHash('md5')
          .update(PNG.sync.write(b))
          .digest('hex');
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

async function stripProto(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = globalThis as unknown as {
      document: {
        querySelector: (selector: string) => { remove: () => void } | null;
      };
    };
    root.document.querySelector('[data-proto]')?.remove();
  });
}

const FINALES = [
  {
    id: 'pdf',
    kind: 'pdf' as const,
    mock: `${ROOT}/page_rapport_pdf/page_rapport_pdf.html`,
    live: `/rapport/${AUDIT_ID}/imprimer?theme=light`,
    ready: 'Synthèse et priorités',
  },
  {
    id: 'confirmation',
    kind: null,
    mock: `${ROOT}/email_confirmation_inscription/email_confirmation_inscription.html`,
    live: '/courriel/confirmation',
    ready: 'Bienvenue sur Audixio',
  },
  {
    id: 'recap',
    kind: null,
    mock: `${ROOT}/email_recap_lundi/email_recap_lundi.html`,
    live: '/courriel/recap',
    ready: 'Votre récap du lundi',
    prep: stripProto,
  },
  {
    id: 'recap-stable',
    kind: null,
    mock: `${ROOT}/email_recap_lundi/email_recap_lundi.html#inchange`,
    live: '/courriel/recap-stable',
    ready: 'Rien n’a changé cette semaine',
    prep: stripProto,
  },
] as const;

test.describe('pdf et courriels, garde visuelle à 30 %', () => {
  for (const item of FINALES) {
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
        if (item.kind) await install(page, item.kind);
        const prep = 'prep' in item ? item.prep : undefined;
        const mock = parse(
          await shoot(page, `file://${item.mock}`, width, prep),
        );
        leaks.length = 0;
        await page.setViewportSize({ width, height: 900 });
        await page.goto(item.live, { waitUntil: 'load' });
        await expect(
          page.getByRole('heading', { name: item.ready }).first(),
        ).toBeVisible();
        const html = await page.content();
        expect(html).not.toContain(MARKER);
        expect(leaks, `requête interdite : ${leaks.join(' ')}`).toEqual([]);
        await page.addStyleTag({ content: 'html{scrollbar-width:none}' });
        const live = parse(
          await page.screenshot({
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
          }),
        );
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
        mkdirSync('/opt/cursor/artifacts', { recursive: true });
        const stem = `${item.id}-${width}`;
        writeFileSync(`${OUT}/${stem}-maquette.png`, PNG.sync.write(a));
        writeFileSync(`${OUT}/${stem}-page.png`, PNG.sync.write(b));
        writeFileSync(`${OUT}/${stem}-diff.png`, PNG.sync.write(diff));
        const side = PNG.sync.write(sideBySide(a, b));
        writeFileSync(`${OUT}/${stem}-cote-a-cote.png`, side);
        writeFileSync(`/opt/cursor/artifacts/${stem}-cote-a-cote.png`, side);
        const mockMd5 = createHash('md5')
          .update(PNG.sync.write(a))
          .digest('hex');
        const pageMd5 = createHash('md5')
          .update(PNG.sync.write(b))
          .digest('hex');
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
