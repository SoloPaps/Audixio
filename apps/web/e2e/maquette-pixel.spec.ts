import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { expect, test, type Page } from '@playwright/test';

const ROOT = '/workspace/docs/design/maquettes/finales';
const OUT = '/opt/cursor/artifacts/pixel';

const PAGES = [
  {
    id: 'hub',
    mock: `${ROOT}/page_rapport_hub/page_rapport_hub.html`,
    live: '/rapport?visuel=1',
  },
  {
    id: 'domaine-ouvert',
    mock: `${ROOT}/page_rapport_domaine/page_rapport_domaine.html`,
    live: '/domaine?visuel=ouvert',
  },
  {
    id: 'domaine-restreint',
    mock: `${ROOT}/page_domaine_restreint/page_domaine_restreint.html`,
    live: '/domaine?visuel=restreint',
  },
  {
    id: 'preuve',
    mock: `${ROOT}/page_verifier_propriete/page_verifier_propriete.html`,
    live: '/verifier?visuel=1',
  },
] as const;

const WIDTHS = [1280, 330] as const;
const MAX_RATIO = 0.01;

test.use({ javaScriptEnabled: false });

async function silenceFonts(page: Page): Promise<void> {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
}

async function shoot(page: Page, url: string, width: number): Promise<Buffer> {
  await silenceFonts(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'load' });
  return page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
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

test.describe('maquettes finales, écart inférieur à 1 %', () => {
  for (const item of PAGES) {
    for (const width of WIDTHS) {
      test(`${item.id} ${width}px`, async ({ page }) => {
        const mock = parse(await shoot(page, `file://${item.mock}`, width));
        const live = parse(await shoot(page, item.live, width));
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
        expect(
          ratio,
          `${stem} : ${(ratio * 100).toFixed(2)} % de pixels différents`,
        ).toBeLessThan(MAX_RATIO);
      });
    }
  }
});
