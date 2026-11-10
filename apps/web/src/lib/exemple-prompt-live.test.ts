import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('M2 — retour visible après copie du prompt Performance', () => {
  it('annonce la copie dans une région live visible', () => {
    const page = readFileSync(
      new URL('../pages/exemple-rapport.astro', import.meta.url),
      'utf8',
    );
    expect(page).toMatch(/id="plive"/);
    expect(page).toMatch(/class="prompt-live"/);
    expect(page).not.toMatch(/id="plive"[^>]*class="sr-only"/);
    expect(page).toContain("live.textContent=L('mq.e.prompt.copied')");
  });
});
