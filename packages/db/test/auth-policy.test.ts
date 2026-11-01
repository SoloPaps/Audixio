import { describe, expect, it } from 'vitest';
import {
  authGuardActive,
  landingPath,
  protectedPath,
  safeNextPath,
  shouldShowWelcome,
  TEST_ANON_KEY,
  validPassword,
  windowStartIso,
} from '../src/auth-policy.js';

describe('politique de connexion', () => {
  it('refuse une redirection ouverte', () => {
    expect(safeNextPath('/sites?x=1')).toBe('/sites?x=1');
    expect(safeNextPath('https://exemple.fr')).toBe('/sites');
    expect(safeNextPath('//exemple.fr')).toBe('/sites');
  });

  it('protège les pages du compte et laisse le retour de lien', () => {
    expect(protectedPath('/sites')).toBe(true);
    expect(protectedPath('/compte/')).toBe(true);
    expect(protectedPath('/bienvenue')).toBe(true);
    expect(protectedPath('/compte/retour')).toBe(false);
    expect(protectedPath('/connexion')).toBe(false);
  });

  it('ignore la clé anon des tests Playwright', () => {
    expect(authGuardActive(undefined)).toBe(false);
    expect(authGuardActive(TEST_ANON_KEY)).toBe(false);
    expect(authGuardActive('cle-reelle')).toBe(true);
  });

  it('montre Bienvenue une fois, seulement pour Google ou GitHub', () => {
    expect(
      shouldShowWelcome({ onboardingVu: false, providers: ['google'] }),
    ).toBe(true);
    expect(
      shouldShowWelcome({ onboardingVu: true, providers: ['github'] }),
    ).toBe(false);
    expect(
      shouldShowWelcome({ onboardingVu: false, providers: ['email'] }),
    ).toBe(false);
  });

  it('envoie l’e-mail confirmé, pas la page Bienvenue', () => {
    expect(
      landingPath({
        kind: 'signup',
        onboardingVu: false,
        providers: ['email'],
        next: '/sites',
      }),
    ).toBe('/email-confirme');
    expect(
      landingPath({
        kind: 'oauth',
        onboardingVu: false,
        providers: ['google'],
        next: '/compte',
      }),
    ).toBe('/bienvenue');
    expect(
      landingPath({
        kind: 'recovery',
        onboardingVu: true,
        providers: ['email'],
        next: null,
      }),
    ).toBe('/reinitialisation?etape=nouveau');
  });

  it('exige 10 caractères et aligne la fenêtre', () => {
    expect(validPassword('court')).toBe(false);
    expect(validPassword('phrase-assez-longue')).toBe(true);
    expect(windowStartIso(1_000_000, 60_000)).toBe(
      new Date(960_000).toISOString(),
    );
  });
});
