import {
  renderRecapMail,
  renderSignupMail,
} from '@audigy/orchestrator/mail-templates';

const LOGO = '/marque/logo-pc.svg';
const PREFS = '/compte/alertes';
const LEGAL = '/mentions-legales';
const REPORT = '/rapport';

/** Aperçu du courriel de confirmation, sans le code à usage unique. */
export function confirmationPreview(): string {
  return renderSignupMail({
    confirmUrl: 'https://audixio.fr/email-confirme?jeton=8f3a…c21',
    prefsUrl: PREFS,
    legalUrl: LEGAL,
    unsubscribeUrl: PREFS,
    logoUrl: LOGO,
  }).html;
}

const CHANGE = [
  {
    grade: 'C',
    host: 'monsite-exemple.fr',
    delta: { label: 'B → C', tone: 'dn' as const },
    items: [
      'Nouveau : 2 images sans texte alternatif',
      'Nouveau : en-tête de sécurité CSP absent',
    ],
    ssl: 'Certificat SSL : expire dans 12 jours',
  },
  {
    grade: 'B',
    host: 'boutique-exemple.fr',
    delta: { label: 'C → B', tone: 'up' as const },
    items: ['Corrigé : cookies déposés avant consentement'],
  },
];

const STEADY = [
  {
    grade: 'C',
    host: 'monsite-exemple.fr',
    delta: { label: 'inchangé', tone: 'eq' as const },
    items: [],
  },
  {
    grade: 'B',
    host: 'boutique-exemple.fr',
    delta: { label: 'inchangé', tone: 'eq' as const },
    items: [],
  },
];

/** Aperçu du récap. Le vrai envoi n’a pas l’historique de note ni le certificat. */
export function recapPreview(mode: 'change' | 'steady'): string {
  return renderRecapMail({
    mode,
    cards: mode === 'steady' ? STEADY : CHANGE,
    reportUrl: REPORT,
    prefsUrl: PREFS,
    legalUrl: LEGAL,
    unsubscribeUrl: PREFS,
    logoUrl: LOGO,
  }).html;
}
