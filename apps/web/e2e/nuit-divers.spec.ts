import { expect, test } from '@playwright/test';

test('/reinitialisation : la confirmation ne laisse pas un e-mail vide', async ({
  page,
}) => {
  await page.goto('/reinitialisation?envoye=1');
  const note = page.locator('.note[role="status"]');
  await expect(note).toBeVisible();
  await expect(note).not.toContainText('pour ,');
  await page.evaluate(() =>
    sessionStorage.setItem('audigy-reset-email', 'camille@exemple.fr'),
  );
  await page.reload();
  await expect(note).toContainText(
    'Si un compte existe pour camille@exemple.fr, un e-mail vient de partir.',
  );
});

test('/sites/…/demandes : « rapport d’audit de exemple.fr » garde son espace', async ({
  page,
}) => {
  await page.goto('/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light');
  await expect(page.locator('main .lede').first()).toContainText(
    'rapport d’audit de exemple.fr',
  );
});

test('/demande-acces 330 px : changer de thème depuis le menu garde la position', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 700 });
  await page.goto('/demande-acces?theme=light');
  await page.evaluate(() =>
    (
      globalThis as unknown as {
        scrollTo: (x: number, y: number) => void;
        scrollY: number;
      }
    ).scrollTo(0, 1200),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            globalThis as unknown as {
              scrollTo: (x: number, y: number) => void;
              scrollY: number;
            }
          ).scrollY,
      ),
    )
    .toBeGreaterThan(1000);
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.locator('.axn-sheet .axn-theme').click();
  await page.keyboard.press('Escape');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            globalThis as unknown as {
              scrollTo: (x: number, y: number) => void;
              scrollY: number;
            }
          ).scrollY,
      ),
    )
    .toBeGreaterThan(1000);
});

function contrast(a: number[], b: number[]): number {
  const lum = (c: number[]) => {
    const [r, g, bl] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0);
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05);
}

test('/pro sombre : les pastilles JSON et PDF client restent lisibles', async ({
  page,
}) => {
  await page.goto('/pro?theme=dark');
  for (const name of ['JSON', 'PDF client']) {
    const pill = page.locator('.fm', { hasText: name }).first();
    const [fg, bg] = await pill.evaluate((el) => {
      const s = (
        globalThis as unknown as {
          getComputedStyle: (node: unknown) => {
            color: string;
            backgroundColor: string;
          };
        }
      ).getComputedStyle(el);
      const rgb = (v: string) =>
        (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      return [rgb(s.color), rgb(s.backgroundColor)];
    });
    expect(contrast(fg ?? [], bg ?? []), name).toBeGreaterThan(4.5);
  }
});

test('/exemple-rapport : pas de handler inline (CSP script-src-attr) et le formulaire ne part pas', async ({
  page,
}) => {
  await page.goto('/exemple-rapport?theme=light');
  const form = page.locator('#pform');
  await expect(form).not.toHaveAttribute('onsubmit');
  const url = page.url();
  await form.evaluate((node) =>
    (node as unknown as { requestSubmit: () => void }).requestSubmit(),
  );
  await page.waitForTimeout(300);
  expect(page.url()).toBe(url);
});

test('/audit-echoue sans id : le titre ne laisse pas un domaine vide', async ({
  page,
}) => {
  await page.goto('/audit-echoue?theme=light');
  const title = page.locator('main h1').first();
  await expect(title).toHaveText('L’audit n’a pas abouti', {
    useInnerText: true,
  });
});
