import { expect, type Page, test } from '@playwright/test';

/** Bug #57 : textes lisibles dans la feuille de partage en thème sombre. */

const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';

function payload(): unknown {
  const domains = [
    ['performance', 58],
    ['seo', 78],
    ['securite', null],
    ['ecologie', 60],
    ['accessibilite', 81],
    ['qualite', 84],
    ['vie_privee', null],
    ['dns_email', null],
  ] as const;
  return {
    audit: {
      id: AUDIT_ID,
      status: 'partial',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: null,
      siteVerified: false,
      partialLabel: 'partielle · 5 domaines · site non vérifié',
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: domains.map(([domain, score]) => ({
      domain,
      score,
      coverage: 1,
      level: score === null ? 'untested' : 'improve',
      locked: score === null,
    })),
    findings: [],
  };
}

type Low = { text: string; ratio: number };

async function lowContrast(page: Page): Promise<Low[]> {
  return page.evaluate(() => {
    (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
      target,
    ) => target;
    type El = {
      parentElement: El | null;
      children: ArrayLike<El>;
      childNodes: ArrayLike<{ nodeType: number; textContent: string | null }>;
      getBoundingClientRect: () => { width: number; height: number };
    };
    const view = globalThis as unknown as {
      document: { querySelector: (s: string) => El | null };
      getComputedStyle: (n: El) => { color: string; backgroundColor: string };
    };
    const rgb = (value: string): number[] =>
      (value.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c: number[]): number => {
      const [r, g, b] = c.slice(0, 3).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
    };
    const bgOf = (node: El): number[] => {
      let cur: El | null = node;
      while (cur) {
        const c = rgb(view.getComputedStyle(cur).backgroundColor);
        if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c;
        cur = cur.parentElement;
      }
      return [255, 255, 255];
    };
    const out: Low[] = [];
    const walk = (node: El): void => {
      const own = Array.from(node.childNodes)
        .filter((child) => child.nodeType === 3)
        .map((child) => child.textContent ?? '')
        .join('')
        .trim();
      const box = node.getBoundingClientRect();
      if (own && box.width > 0 && box.height > 0) {
        const a = lum(rgb(view.getComputedStyle(node).color));
        const b = lum(bgOf(node));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (ratio < 4.5) {
          out.push({ text: own, ratio: Math.round(ratio * 100) / 100 });
        }
      }
      for (const child of Array.from(node.children)) walk(child);
    };
    const root = view.document.querySelector('.sh-dlg');
    if (root) walk(root);
    return out;
  });
}

const SESSION = {
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

async function darkSheet(page: Page): Promise<void> {
  await page.setViewportSize({ width: 330, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(`/rapport/${AUDIT_ID}?theme=dark`);
  await page.locator('#shareBtn').click();
  await expect(page.locator('.sh-dlg')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
}

// Visiteur : plus de création de lien (matrice), l’appel à créer un compte reste lisible.
test('feuille de partage lisible en thème sombre (#57), visiteur', async ({
  page,
}) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 401, body: '{}' }),
  );
  await page.addInitScript(
    ([key, value]) => {
      const view = globalThis as unknown as {
        sessionStorage: { setItem: (name: string, data: string) => void };
      };
      view.sessionStorage.setItem(key, value);
    },
    ['audixio-guest-audit', JSON.stringify(payload())] as const,
  );
  await darkSheet(page);
  await expect(
    page.locator('.sh-dlg').getByRole('link', { name: 'Créer un compte' }),
  ).toBeVisible();
  expect(await lowContrast(page)).toEqual([]);
});

// Compte : le lien créé et sa pastille « Lien actif » restent lisibles.
test('feuille de partage lisible en thème sombre (#57), compte', async ({
  page,
}) => {
  await page.addInitScript((value) => {
    (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, SESSION);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 401, body: '{}' }),
  );
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SESSION.user),
    }),
  );
  await page.route('http://127.0.0.1:54321/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().url().includes('/auth/v1/')
        ? JSON.stringify(SESSION.user)
        : '[]',
    }),
  );
  await page.route('**/api/audits/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload()),
    }),
  );
  await page.route('**/api/liens**', (route) => {
    const write = route.request().method().toLowerCase() === 'post';
    return route.fulfill({
      status: write ? 201 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        write
          ? { id: 'lien-1', url: '/partage/k7Qm2xVaPq9Zt3Lw' }
          : { liens: [] },
      ),
    });
  });
  await darkSheet(page);
  await page.locator('.sh-dlg .sh-main').click();
  await expect(page.locator('.sh-pill.on')).toBeVisible();
  expect(await lowContrast(page)).toEqual([]);
});
