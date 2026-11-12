import { expect, type Page, test } from '@playwright/test';

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

function auditBody(locked: boolean): unknown {
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
      partialLabel: locked ? 'partielle · 1 domaines · site non vérifié' : null,
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
      { domain: 'performance', score: 58, coverage: 1, level: 'improve' },
      ...[
        'accessibilite',
        'seo',
        'ecoconception',
        'rgpd',
        'qualite',
        'mobile',
      ].map((domain, i) => ({
        domain,
        score: 40 + i * 9,
        coverage: 1,
        level: 'improve',
      })),
      {
        domain: 'securite',
        score: locked ? null : 62,
        coverage: 1,
        level: locked ? 'locked' : 'improve',
        locked,
      },
    ],
    findings: locked
      ? [
          {
            domain: 'performance',
            checkId: 'performance.poids',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'performance.poids.fail',
            params: {},
            fixKey: null,
            effortMinutes: 20,
            reason: null,
          },
        ]
      : [
          {
            domain: 'performance',
            checkId: 'performance.poids',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'performance.poids.fail',
            params: {},
            fixKey: null,
            effortMinutes: 20,
            reason: null,
          },
          {
            domain: 'securite',
            checkId: 'securite.hsts',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'securite.hsts.fail',
            params: {},
            fixKey: 'securite.hsts',
            effortMinutes: 10,
            reason: null,
          },
        ],
  };
}

async function install(page: Page, locked = false): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody(locked)),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().url().includes('action_plan') ? '[]' : 'null',
    });
  });
}

// Rectangles du texte (pas de la boîte) pour repérer coupures et chevauchements.
const GEO = `(() => {
  const textRects = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return [...range.getClientRects()].filter((r) => r.width && r.height);
  };
  const hero = document.querySelector('section.hero').getBoundingClientRect();
  const out = [];
  for (const el of document.querySelectorAll('.hero-right .rose svg, .note-txt *, .stage-shot .shot')) {
    const boxes = el.matches('svg, .shot') ? [el.getBoundingClientRect()] : textRects(el);
    for (const r of boxes)
      if (r.left < hero.left - 0.5 || r.right > hero.right + 0.5)
        out.push('hero: ' + (el.getAttribute('class') || el.tagName) + ' ' + Math.round(r.left) + '-' + Math.round(r.right));
  }
  for (const dom of document.querySelectorAll('.dom')) {
    const bar = dom.querySelector('.bar');
    const sum = dom.querySelector('.dom-sum');
    if (!bar || !sum) continue;
    const b = bar.getBoundingClientRect();
    for (const r of textRects(sum)) {
      const w = Math.min(r.right, b.right) - Math.max(r.left, b.left);
      const h = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
      if (w > 0.5 && h > 0.5) out.push('domaine: ' + sum.textContent.trim().slice(0, 40));
    }
    if (sum.getBoundingClientRect().width < 110) out.push('colonne étroite: ' + Math.round(sum.getBoundingClientRect().width));
  }
  return out;
})()`;

for (const [lang, theme] of [
  ['fr', 'dark'],
  ['en', 'light'],
] as const)
  test(`#76/#80 rapport lisible à 330 px (${lang}, ${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await install(page);
    await page.setViewportSize({ width: 330, height: 900 });
    await page.goto(`/rapport/${AUDIT_ID}?theme=${theme}&lang=${lang}`);
    await expect(page.locator('.dom .bar').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.evaluate(`document.fonts.ready`);
    expect(await page.evaluate<string[]>(GEO)).toEqual([]);
  });
