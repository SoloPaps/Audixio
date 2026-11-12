import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';
import { ORIGIN } from './origin.js';

const CORS = {
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'content-type': 'application/json',
};

async function oneSite(page: Page): Promise<void> {
  await page.route('http://127.0.0.1:54321/rest/v1/sites**', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({
          status: 200,
          headers: CORS,
          body: JSON.stringify([
            {
              id: '33333333-3333-4333-8333-333333333333',
              url: 'https://bon.audigy.test',
              label: 'bon.audigy.test',
              host: 'bon.audigy.test',
              is_public: false,
              public_slug: null,
              expose_security: false,
            },
          ]),
        }),
  );
}

// QA Mo 05/11, thème ui-mobile-i18n.

test('B9 (bug_db548bd2) : /sites en anglais, titre « Why monitor your domains? » sans français', async ({
  page,
}) => {
  await stubSession(page, 'free');
  await oneSite(page);
  await page.goto('/sites?theme=light&lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('heading', { name: 'Why monitor your domains?' }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Pourquoi surveiller')).toHaveCount(0);
});

test('B10 (bug_b3d701fc) : contact en anglais, motif entièrement anglais et lisible à 330 px', async ({
  page,
}) => {
  await stubSession(page, 'free');
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/compte?theme=light&lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const reason = page.locator('select#mot');
  await expect(reason.locator('option').first()).toHaveText(
    'Question about a security audit',
    { timeout: 15_000 },
  );
  const options = await reason.locator('option').allTextContents();
  for (const text of options) {
    expect(text).not.toMatch(/\b(un|de|sur|sécurité|diagnostic)\b/);
  }
  await reason.scrollIntoViewIfNeeded();
  const box = await reason.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(330);
});

for (const lang of ['en', 'fr'] as const) {
  test(`B7 (bug_bbf3506c) : le point du consentement reste sur la ligne du lien (${lang})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    if (lang === 'en') {
      await page.goto('/bienvenue?theme=dark');
      await toEnglish(page);
    }
    for (const width of [1920, 1280, 330]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/inscription?theme=dark');
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      const label = page.locator('.auth-card .chk').filter({
        has: page.locator('a[href="/confidentialite"]'),
      });
      await expect(label).toBeVisible({ timeout: 15_000 });
      const lines = await label.evaluate((node) => {
        const doc = (node as unknown as { ownerDocument: unknown })
          .ownerDocument as {
          createRange: () => {
            setStart: (n: unknown, o: number) => void;
            setEnd: (n: unknown, o: number) => void;
            getBoundingClientRect: () => { top: number; bottom: number };
          };
        };
        const root = node as unknown as {
          querySelector: (s: string) => {
            nextSibling: { textContent: string } | null;
            getBoundingClientRect: () => { top: number; bottom: number };
          };
          getBoundingClientRect: () => { right: number };
        };
        const link = root.querySelector('a[href="/confidentialite"]');
        const dot = link.nextSibling;
        if (!dot || dot.textContent !== '.') return null;
        const range = doc.createRange();
        range.setStart(dot, 0);
        range.setEnd(dot, 1);
        const a = link.getBoundingClientRect();
        const b = range.getBoundingClientRect();
        return {
          linkTop: a.top,
          linkBottom: a.bottom,
          dotTop: b.top,
          dotBottom: b.bottom,
        };
      });
      expect(lines, `${lang} ${width}`).not.toBeNull();
      // Le point se trouve dans la hauteur de la dernière ligne du lien.
      expect(lines?.dotTop ?? 0, `${lang} ${width}`).toBeGreaterThanOrEqual(
        (lines?.linkTop ?? 0) - 1,
      );
      expect(lines?.dotBottom ?? 0, `${lang} ${width}`).toBeLessThanOrEqual(
        (lines?.linkBottom ?? 0) + 1,
      );
      const overflow = await page.evaluate(
        () =>
          (
            globalThis as unknown as {
              document: { documentElement: { scrollWidth: number } };
              innerWidth: number;
            }
          ).document.documentElement.scrollWidth -
          (globalThis as unknown as { innerWidth: number }).innerWidth,
      );
      expect(overflow, `${lang} ${width}`).toBeLessThanOrEqual(0);
    }
  });
}

const GUEST_ID = '1dfeaad0-f09c-4405-a5eb-eed8fe1235b6';

function guestPayload(): unknown {
  return {
    audit: {
      id: GUEST_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 61,
      siteVerified: false,
      coverage: 0.6,
      createdAt: '2026-11-05T10:00:00.000Z',
      startedAt: '2026-11-05T10:00:01.000Z',
      finishedAt: '2026-11-05T10:03:00.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123457',
        url: 'https://mauvais.audigy.test',
        label: 'mauvais.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 52, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 70, coverage: 1, level: 'improve' },
    ],
    findings: [],
  };
}

for (const lang of ['fr', 'en'] as const) {
  test(`B6 (bug_39f1152d) : fin d’audit visiteur, aperçu partiel sans promesse de plan (${lang})`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      sessionStorage.setItem('audixio-guest-audit', JSON.stringify(value));
    }, guestPayload());
    if (lang === 'en') {
      await page.goto('/bienvenue?theme=light');
      await toEnglish(page);
    }
    await page.goto(`/progression?id=${GUEST_ID}&theme=light`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    const lead = page.locator('#leadT');
    const eyebrow = page.locator('.eyebrow.intro');
    if (lang === 'en') {
      await expect(lead).toHaveText(
        'The analysis is finished. Your free preview is ready; the full report and the action plan require an account.',
        { timeout: 15_000 },
      );
      await expect(eyebrow).toHaveText('Free preview · no account');
    } else {
      await expect(lead).toHaveText(
        'L’analyse est terminée. Votre aperçu gratuit est prêt ; le rapport complet et le plan d’action demandent un compte.',
        { timeout: 15_000 },
      );
      await expect(eyebrow).toHaveText('Aperçu gratuit · sans compte');
    }
    await expect(
      page.getByText(/full diagnosis|diagnostic complet/i),
    ).toHaveCount(0);
    await expect(page.getByText(/active session|session active/i)).toHaveCount(
      0,
    );
  });
}

for (const lang of ['fr', 'en'] as const) {
  test(`/progression : la fenêtre e-mail suit la langue jusqu’à la confirmation (${lang})`, async ({
    page,
  }) => {
    if (lang === 'en') {
      await page.goto('/bienvenue?theme=light');
      await toEnglish(page);
    }
    await page.goto('/progression?maquette=1&theme=light');
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    const copy =
      lang === 'en'
        ? {
            placeholder: 'you@example.com',
            sent: 'Got it!',
            done: 'Notification on',
          }
        : {
            placeholder: 'vous@exemple.fr',
            sent: 'C’est noté !',
            done: 'Notification activée',
          };
    await page.locator('#notifyBtn').click();
    const mail = page.locator('#notify #email');
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute('placeholder', copy.placeholder);
    await mail.fill('qa@example.com');
    await page.locator('#notifyForm button[type="submit"]').click();
    await expect(page.locator('#dlgT')).toHaveText(copy.sent);
    await expect(page.locator('#notifyBtn')).toHaveText(copy.done);
  });
}

const SEC_ID = '00000000-0000-4000-8000-0000000000b3';

function securityPayload(): unknown {
  return {
    audit: {
      id: SEC_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 74,
      siteVerified: true,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-10-26T10:00:00.000Z',
      startedAt: '2026-10-26T10:00:01.000Z',
      finishedAt: '2026-10-26T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [{ domain: 'securite', score: 70, coverage: 1, level: 'improve' }],
    findings: [
      {
        domain: 'securite',
        checkId: 'securite.frames',
        status: 'fail',
        severity: 3,
        impact: 2,
        score: 0,
        measured: {},
        messageKey: 'securite.frames.fail',
        params: {},
        fixKey: 'securite.frames',
        effortMinutes: 10,
        reason: null,
      },
    ],
  };
}

// Éléments qui dépassent à droite, hors contenu d’un bloc de code défilant.
const OVERFLOW = `(() => {
  const out = [];
  const width = innerWidth;
  for (const el of document.querySelectorAll(SCOPE)) {
    if (el.closest('pre')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > width + 0.5) out.push(el.tagName + ' ' + (el.textContent || '').slice(0, 40));
  }
  for (const pre of document.querySelectorAll(SCOPE_PRE)) {
    const r = pre.getBoundingClientRect();
    if (r.right > width + 0.5) out.push('PRE ' + pre.textContent.slice(0, 40));
    if (getComputedStyle(pre).overflowX !== 'auto') out.push('PRE sans défilement');
  }
  return out;
})()`;

for (const lang of ['fr', 'en'] as const) {
  test(`B3 (bug_5a7c5a44, bug_b18024d6) : corrections Sécurité lisibles à 330 px en sombre (${lang})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await stubSession(page, 'pro');
    await page.route('**/api/audits/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(securityPayload()),
      }),
    );
    await page.setViewportSize({ width: 330, height: 900 });

    // Rapport du domaine : « Détails » du constat frames.
    await page.goto(
      `/domaine?id=${SEC_ID}&domaine=securite&theme=dark&lang=${lang}`,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await page.locator('.cst .det').first().click();
    await expect(page.locator('.acc.open pre.step-code').first()).toBeVisible();
    const domain = await page.evaluate<string[]>(
      OVERFLOW.replace('SCOPE_PRE', "'.acc.open pre'").replace(
        'SCOPE',
        "'.acc.open *'",
      ),
    );
    expect(domain).toEqual([]);

    // Page de correction : plan d’action en étapes.
    await page.goto(
      `/constat?id=${SEC_ID}&check=securite.frames-0&theme=dark&lang=${lang}`,
    );
    await page.locator('a[href="#plan"]').first().click();
    await expect(page.locator('#plan pre.step-code').first()).toBeVisible();
    const plan = await page.evaluate<string[]>(
      OVERFLOW.replace('SCOPE_PRE', "'#plan pre'").replace(
        'SCOPE',
        "'#plan *'",
      ),
    );
    expect(plan).toEqual([]);
  });
}
