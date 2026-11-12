import {
  renderAuditEndMail,
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

const END_PRIORITIES_FR = [
  'Ajouter un texte alternatif aux images du bandeau.',
  'Activer HSTS sur le domaine.',
  'Publier un fichier robots.txt explicite.',
];
const END_PRIORITIES_EN = [
  'Add alt text to the banner images.',
  'Enable HSTS on the domain.',
  'Publish an explicit robots.txt file.',
];

export function auditEndPreview(
  outcome: 'ready' | 'failed',
  locale: 'fr' | 'en',
  reason: 'denied' | 'down' | 'stale' | 'generic' = 'denied',
): string {
  const report =
    'https://audixio.fr/rapport/11111111-1111-4111-8111-111111111111';
  const retry =
    'https://audixio.fr/progression?site=22222222-2222-4222-8222-222222222222&url=https%3A%2F%2Fexemple.fr';
  return renderAuditEndMail({
    outcome,
    domain: 'exemple.fr',
    score: 65,
    grade: 'C',
    priorities: locale === 'en' ? END_PRIORITIES_EN : END_PRIORITIES_FR,
    reason,
    actionUrl: outcome === 'failed' ? retry : report,
    prefsUrl: 'https://audixio.fr/compte',
    legalUrl: 'https://audixio.fr/mentions-legales',
    locale,
  }).html;
}
