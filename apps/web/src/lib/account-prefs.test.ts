import { describe, expect, it } from 'vitest';
import {
  alertsOpenForPlan,
  consentChecked,
  latestReportHref,
  welcomeDone,
} from './account-prefs.js';

describe('compte', () => {
  it('ouvre le dernier rapport, pas une page vide', () => {
    expect(latestReportHref('abc')).toBe('/rapport?id=abc');
    expect(latestReportHref(null)).toBe('/sites');
    expect(latestReportHref(null)).not.toBe('/rapport');
  });

  it('déverrouille les alertes sur mesure pour un compte Pro', () => {
    expect(alertsOpenForPlan('pro')).toBe(true);
    expect(alertsOpenForPlan('free')).toBe(false);
  });

  it('conserve le consentement statistique décoché', () => {
    expect(consentChecked('0', true)).toBe(false);
    expect(consentChecked('1', false)).toBe(true);
    expect(consentChecked(null, true)).toBe(true);
  });

  it('conserve une étape de bienvenue cochée', () => {
    expect(welcomeDone(['e1'], 'e1')).toBe(true);
    expect(welcomeDone(['e1'], 'e2')).toBe(false);
  });
});
