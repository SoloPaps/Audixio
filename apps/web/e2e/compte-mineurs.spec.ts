import { expect, type Page, test } from '@playwright/test';

const USER = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'gratuit@exemple.fr' },
};

async function install(page: Page): Promise<void> {
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: 3600,
        user: {
          id: USER,
          aud: 'authenticated',
          role: 'authenticated',
          email: session.user.email,
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-10-23T00:00:00.000Z',
        },
      }),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? 'http://127.0.0.1:4321';
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = request.url();
    if (url.includes('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'free' }),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
}

const LOW = `(() => {
  const lum = (rgb) => {
    const [r, g, b] = (rgb.match(/[\\d.]+/g) || []).slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const opaque = (el) => {
    for (let node = el; node; node = node.parentElement) {
      const c = getComputedStyle(node).backgroundColor;
      const m = c.match(/rgba\\([^)]*,\\s*([\\d.]+)\\)/);
      if (!m || Number(m[1]) >= 0.9) return c;
    }
    return 'rgb(255, 255, 255)';
  };
  const bad = [];
  for (const el of document.querySelectorAll('main *, #search-console *')) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    // Logotypes de marque (tuiles .lg) : exemptés par le WCAG 1.4.3.
    if (el.closest('.lg')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || el.closest('[hidden],[aria-hidden="true"] svg, .sr-only')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (Number(s.opacity) === 0) continue;
    if (s.webkitBackgroundClip === 'text' || s.backgroundClip === 'text') continue;
    const a = lum(s.color), b = lum(opaque(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) bad.push(el.tagName + '.' + el.className + ' "' + el.textContent.trim().slice(0, 30) + '" ' + ratio.toFixed(2) + ' ' + s.color + ' / ' + opaque(el));
  }
  return bad;
})()`;

// #31 : en sombre, les textes de /compte restent lisibles (contraste ≥ 4.5).
test('#31 textes de /compte lisibles en sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await install(page);
  await page.goto('/compte?theme=dark');
  await expect(page.locator('#search-console button').first()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(1500);
  expect(await page.evaluate<string[]>(LOW)).toEqual([]);
});
