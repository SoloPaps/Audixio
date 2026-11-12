import { expect, test } from '@playwright/test';

// Règles générales de v6.css : la feuille d’une page portée garde la main dans
// sa portée [data-port] ; les pages v6 natives gardent le dessin des composants.
test('page portée : une règle de page sur .btn gagne contre v6.css', async ({
  page,
}) => {
  await page.goto('/500?theme=light');
  await page.addStyleTag({
    content: '.er5 .sonde-v6 { display: none; } .er5 .nav { gap: 3px; }',
  });
  await page.evaluate(`(() => {
    const root = document.querySelector('.er5[data-port]');
    const a = document.createElement('a');
    a.className = 'btn sonde-v6';
    a.href = '/';
    a.textContent = 'sonde';
    const n = document.createElement('div');
    n.className = 'nav sonde-nav';
    root.append(a, n);
  })()`);
  await expect(page.locator('.er5 .sonde-v6')).toBeHidden();
  await expect(page.locator('.er5 .sonde-nav')).toHaveCSS('gap', '3px');
  // Les boutons fantômes de la page gardent leur bordure (v6 les remplissait).
  await expect(page.locator('.er5 a.btn.btn-ghost').first()).toHaveCSS(
    'border-top-width',
    '1px',
  );
});

test('page v6 native : les composants .btn gardent le dessin v6', async ({
  page,
}) => {
  await page.goto('/methode?theme=light');
  await page.evaluate(`(() => {
    const a = document.createElement('a');
    a.className = 'btn sonde-v6';
    a.href = '/';
    a.textContent = 'sonde';
    document.querySelector('main').append(a);
  })()`);
  await expect(page.locator('main .sonde-v6')).toHaveCSS(
    'display',
    'inline-flex',
  );
});
