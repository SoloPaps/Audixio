import { expect, type Page, test } from '@playwright/test';

const AUDIT_ID = '00000000-0000-4000-8000-00000000b101';

function guestPayload(): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: null,
      siteVerified: false,
      partialLabel: 'partielle · site non vérifié',
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-00000000b102',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 80, coverage: 1, level: 'good' },
      {
        domain: 'securite',
        score: null,
        coverage: 0,
        level: 'locked',
        locked: true,
      },
    ],
    findings: [],
  };
}

async function openLockedSecurity(page: Page): Promise<void> {
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/');
  await page.evaluate(
    (value) => {
      const storage = (
        globalThis as unknown as {
          sessionStorage: { setItem: (key: string, item: string) => void };
        }
      ).sessionStorage;
      storage.setItem(
        'audixio-guest-audit',
        JSON.stringify({ [value.audit.id]: value }),
      );
    },
    guestPayload() as { audit: { id: string } },
  );
  await page.goto(`/rapport/${AUDIT_ID}?theme=dark`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#domaine-securite').click();
  await expect(page.locator('.gg-root .gg')).toBeVisible();
}

function alpha(color: string): number {
  const match = color.match(
    /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*([\d.]+))?\s*\)/,
  );
  if (!match) return 0;
  return match[1] === undefined ? 1 : Number(match[1]);
}

test('B1 : la fenêtre visiteur sombre à 330 px a un fond opaque', async ({
  page,
}) => {
  await openLockedSecurity(page);
  const dialog = page.locator('.gg-root .gg');
  const veil = page.locator('.gg-veil');
  const title = page.locator('#gg-title');
  const cssOf = async (
    locator: typeof dialog,
    prop: 'backgroundColor' | 'color',
  ) =>
    locator.evaluate((node, name) => {
      const view = globalThis as unknown as {
        getComputedStyle: (el: unknown) => {
          backgroundColor: string;
          color: string;
        };
      };
      return view.getComputedStyle(node)[name];
    }, prop);
  const dialogBg = await cssOf(dialog, 'backgroundColor');
  const titleColor = await cssOf(title, 'color');
  const veilBg = await cssOf(veil, 'backgroundColor');
  expect(alpha(dialogBg), dialogBg).toBeGreaterThanOrEqual(0.95);
  expect(alpha(veilBg), veilBg).toBeGreaterThanOrEqual(0.6);
  expect(dialogBg).not.toBe('rgba(0, 0, 0, 0)');
  // Contraste titre / fond (luminances relatives sRGB).
  const lum = (c: string): number => {
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return 0;
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const ch = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const [lr, lg, lb] = ch;
    return 0.2126 * (lr ?? 0) + 0.7152 * (lg ?? 0) + 0.0722 * (lb ?? 0);
  };
  const fg = lum(titleColor);
  const bg = lum(dialogBg);
  const hi = Math.max(fg, bg);
  const lo = Math.min(fg, bg);
  expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
});
