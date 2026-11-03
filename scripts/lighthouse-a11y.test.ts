import { describe, expect, it } from 'vitest';
import {
  A11Y_ATTEMPTS,
  a11yAttempt,
  chromePathFromOutput,
} from './lighthouse-a11y.mjs';

describe('lighthouse a11y', () => {
  it('lit le rapport seulement quand Chrome a fini', () => {
    expect(a11yAttempt(0, 1)).toBe('read');
    expect(a11yAttempt(1, 1)).toBe('retry');
    expect(a11yAttempt(1, A11Y_ATTEMPTS)).toBe('fail');
    expect(a11yAttempt(null, A11Y_ATTEMPTS)).toBe('fail');
  });

  it('garde le chemin Chromium et ignore le bruit de pnpm', () => {
    expect(
      chromePathFromOutput(
        '.                                        | \u2009WARN\u2009\n/home/runner/.cache/ms-playwright/chromium/chrome\n',
      ),
    ).toBe('/home/runner/.cache/ms-playwright/chromium/chrome');
    expect(chromePathFromOutput('')).toBe('');
  });
});
