/**
 * Textes du chrome et du formulaire d’accueil, seuls à partir
 * dans le JavaScript de la page d’accueil. Le dictionnaire complet
 * reste côté serveur.
 */
export const slim = {
  'locale.label': 'Langue',
  'locale.en.short': 'EN — English',
  'locale.fr.short': 'FR — Français',
  'theme.label': 'Thème',
  'theme.system': 'Système',
  'theme.light': 'Clair',
  'theme.dark': 'Sombre',
  'theme.dark.later': 'Mode sombre : bientôt disponible',
  'home.url.long': 'Adresse du site web à analyser',
  'home.submit.free': "Lancer l'audit gratuit",
  'home.url.format': 'Format attendu : https://domaine.fr',
  'home.url.example': 'https://exemple.fr',
  'home.url.error': 'Indiquez une adresse complète, comme https://exemple.fr.',
  'home.method': 'Comment le score est calculé',
  'nav.sites.long': 'Sites suivis',
  'nav.close': 'Fermer le menu',
  'nav.account': 'Compte',
  'nav.login': 'Connexion',
  'nav.method': 'Méthode',
  'nav.menu': 'Menu',
  'nav.home': 'Accueil',
  'nav.pricing': 'Tarifs',
  'nav.how': 'Comment ça marche',
  'nav.example': 'Exemple de rapport',
  'nav.mysites': 'Mes sites',
  'nav.scan': 'Scanner mon site',
  'nav.backtop': 'Remonter en haut',
  'nav.bottom': 'Navigation principale',
  'nav.open': 'Ouvrir le menu',
  'nav.mobile': 'Navigation principale (mobile)',
  'footer.home': 'Audixio — accueil',
} as const;

export type SlimKey = keyof typeof slim;

export function t(key: SlimKey): string {
  return slim[key];
}
