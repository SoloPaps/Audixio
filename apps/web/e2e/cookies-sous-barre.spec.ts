import { expect, test } from '@playwright/test';

// Panneau cookies ouvert dans une vraie fenêtre de téléphone : la boîte
// passait sous la barre de menu (bouton fermer caché, bas coupé).
for (const height of [844, 664]) {
  test(`/cookies ouvert à 390×${height} : rien sous la barre de menu`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height });
    await page.goto('/cookies?theme=light');
    await page.locator('#ps').click();
    await expect(page.locator('#pref')).toBeFocused();
    await page.waitForTimeout(700);
    const box = await page.evaluate<{
      bar: number;
      top: number;
      wrapTop: number;
    }>(
      `(() => { const w = document.querySelector('.cks .wrap'); w.scrollTop = 0;
        return { bar: document.getElementById('axn').getBoundingClientRect().bottom,
          top: document.querySelector('.cks .bn').getBoundingClientRect().top,
          wrapTop: w.getBoundingClientRect().top }; })()`,
    );
    expect(box.wrapTop).toBeGreaterThanOrEqual(box.bar);
    expect(box.top).toBeGreaterThanOrEqual(box.bar);
    // Chaque commande de la boîte peut être amenée à l’écran, hors de la barre.
    for (const id of ['ck-close', 'sv', 'ac', 'rf', 'ps']) {
      const r = await page.evaluate<{ top: number; bottom: number }>(
        `(() => { const e = document.getElementById(${JSON.stringify(id)}); e.scrollIntoView({ block: 'nearest' });
          const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; })()`,
      );
      expect(r.top, id).toBeGreaterThanOrEqual(box.bar);
      expect(r.bottom, id).toBeLessThanOrEqual(height + 1);
    }
  });
}
