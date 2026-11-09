import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/index.js';

const page = readFileSync(
  new URL('../pages/exemple-rapport.astro', import.meta.url),
  'utf8',
);
const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const PROMPT_KEYS = [
  'mq.e.prompt.role',
  'mq.e.prompt.fix',
  'mq.e.prompt.check',
  'mq.e.prompt.files',
  'mq.e.prompt.copied',
  'mq.e.prompt.copied.short',
  'mq.e.short.sec',
  'mq.e.short.eco',
  'mq.e.short.code',
  'mq.e.short.priv',
] as const;

describe('exemple-rapport, textes au catalogue', () => {
  it('n’embarque plus le générateur de prompt ni les raccourcis en dur', () => {
    expect(page).not.toContain('Tu es un développeur web');
    expect(page).not.toContain('You are a web developer');
    expect(page).not.toContain('var CJE=');
    expect(page).not.toContain('data-short="Sécurité"');
    expect(page).not.toContain("live.textContent=isEn()?'Prompt copied'");
    expect(page).toContain('data-short-key="mq.e.short.sec"');
    expect(page).toContain("L('mq.e.prompt.role')");
  });

  it('distingue les raccourcis et le prompt entre FR et EN', () => {
    for (const key of PROMPT_KEYS) {
      expect(fr[key], key).toBeTruthy();
      expect(en[key], key).toBeTruthy();
    }
    expect(en['mq.e.short.sec']).toBe('Security');
    expect(en['mq.e.short.eco']).toBe('Ecology');
    expect(en['mq.e.short.code']).toBe('Quality');
    expect(en['mq.e.short.priv']).toBe('Privacy');
    expect(fr['mq.e.short.sec']).toBe('Sécurité');
    expect(en['mq.e.prompt.role']).not.toBe(fr['mq.e.prompt.role']);
  });
});
