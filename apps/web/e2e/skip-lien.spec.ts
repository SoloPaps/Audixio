import { expect, type Page, test } from '@playwright/test';

const PRIMARY = 'rgb(61, 82, 160)';

const CANON = [
  '/',
  '/methode',
  '/sites',
  '/lancer',
  '/passer-pro',
  '/pro',
  '/audit-echoue',
  '/cookies',
  '/mentions-legales',
  '/cgu',
  '/confidentialite',
  '/accessibilite',
  '/ecoconception',
  '/maintenance',
  '/exemple-rapport',
  '/demande-acces',
  '/robot',
];

async function skipBox(page: Page): Promise<{
  y: number;
  height: number;
  font: string;
} | null> {
  const link = page.locator('a.skip');
  if ((await link.count()) !== 1) return null;
  const text = (await link.textContent()) ?? '';
  if (!text.includes('principal')) return null;
  return link.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (elt: typeof node) => { fontFamily: string };
    };
    const box = node.getBoundingClientRect();
    return {
      y: box.y,
      height: box.height,
      font: view.getComputedStyle(node).fontFamily,
    };
  });
}

test('le lien d’évitement Canon reste hors écran', async ({ page }) => {
  for (const route of CANON) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), route).toBeTruthy();
    const box = await skipBox(page);
    if (!box) throw new Error(route);
    expect(box.y + box.height, route).toBeLessThanOrEqual(0);
    expect(box.font, route).toContain('Inter');
  }
});

test('le lien d’évitement apparaît au focus clavier', async ({ page }) => {
  for (const route of ['/lancer', '/sites']) {
    await page.goto(route, { waitUntil: 'load' });
    await page.locator('a.skip').waitFor({ state: 'attached' });
    await page.keyboard.press('Tab');
    const link = page.locator('a.skip');
    await expect(link).toBeFocused();
    const box = await link.boundingBox();
    expect(box?.y ?? -1, route).toBeGreaterThanOrEqual(0);
  }
});

test('Inscription de la fenêtre sans compte : même primaire bureau et 330 px', async ({
  page,
}) => {
  for (const width of [1280, 330]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/lancer?site=exemple', { waitUntil: 'domcontentloaded' });
    const button = page
      .getByRole('dialog')
      .getByRole('link', { name: 'Inscription' });
    await expect(button).toBeVisible();
    await page.mouse.move(0, 0);
    const color = await button.evaluate((node) => {
      const view = globalThis as unknown as {
        getComputedStyle: (elt: typeof node) => { backgroundColor: string };
      };
      return view.getComputedStyle(node).backgroundColor;
    });
    expect(color, `lancer ${width}`).toBe(PRIMARY);
  }

  const id = '11111111-1111-4111-8111-111111111111';
  const payload = {
    audit: {
      id,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '1',
      engineVersion: '1',
      globalScore: null,
      siteVerified: false,
      partialLabel: null,
      coverage: 0,
      createdAt: '2026-11-03T12:00:00.000Z',
      startedAt: '2026-11-03T12:00:00.000Z',
      finishedAt: '2026-11-03T12:00:00.000Z',
      error: null,
      site: {
        id: '22222222-2222-4222-8222-222222222222',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      'performance',
      'seo',
      'securite',
      'ecologie',
      'accessibilite',
      'qualite',
      'vie_privee',
      'dns_email',
    ].map((domain) => ({
      domain,
      score: null,
      coverage: 0,
      level: 'untested',
      locked:
        domain === 'securite' ||
        domain === 'vie_privee' ||
        domain === 'dns_email',
    })),
    findings: [],
  };
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    ['audixio-guest-audit', JSON.stringify(payload)] as const,
  );
  for (const width of [1280, 330]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/rapport?id=${id}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#domaine-securite').click();
    const button = page
      .getByRole('dialog')
      .getByRole('link', { name: 'Inscription' });
    await expect(button).toBeVisible();
    await page.mouse.move(0, 0);
    const color = await button.evaluate((node) => {
      const view = globalThis as unknown as {
        getComputedStyle: (elt: typeof node) => { backgroundColor: string };
      };
      return view.getComputedStyle(node).backgroundColor;
    });
    expect(color, `hub ${width}`).toBe(PRIMARY);
  }
});
