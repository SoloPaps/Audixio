/** Phrases du lancement accueil. Hors du dictionnaire complet, pour rester sous 500 Ko. */
const copy = {
  'api.error.host_limit':
    'Ce site a été audité il y a moins de 15 minutes. Réessayez plus tard.',
  'api.error.invalid_url':
    'Cette adresse ne convient pas. Exemple : https://exemple.fr',
  'api.error.invalid_input': 'La demande est incomplète. Vérifiez l’adresse.',
  'api.error.user_limit':
    'Vous avez lancé 10 audits aujourd’hui. Réessayez demain.',
  'api.error.unauthorized': 'Connectez-vous pour lancer ou lire un audit.',
  'api.error.guest_limit':
    'Trois audits ont déjà été lancés aujourd’hui depuis ce réseau.',
  'api.error.internal':
    'Le service ne répond pas pour le moment. Réessayez dans quelques minutes.',
  'guest.gate.kicker': 'Sans compte',
  'guest.gate.title': 'Connectez-vous ou inscrivez-vous',
  'guest.gate.lead':
    'Trois audits par jour sont offerts sans compte. Le détail demande un compte.',
  'guest.gate.login': 'Connexion',
  'guest.gate.signup': 'Inscription',
  'guest.gate.close': 'Fermer',
} as const;

export type HomeCopyKey = keyof typeof copy;

export function t(key: HomeCopyKey): string {
  return copy[key];
}
