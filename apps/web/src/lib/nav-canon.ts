/** Entrées de la barre, dans l’ordre (STRUCTURE.md §1). Le logo mène à « / ». */
export const NAV_GUEST = [
  { href: '/methode', key: 'nav.how' },
  { href: '/exemple-rapport', key: 'nav.example' },
  { href: '/pro', key: 'nav.pricing' },
] as const;

export const NAV_MEMBER = [{ href: '/sites', key: 'nav.mysites' }] as const;

/** Bouton principal : le formulaire du héros de l’accueil. */
export const SCAN_HREF = '/#audit-form';

export type NavKey =
  | (typeof NAV_GUEST)[number]['key']
  | (typeof NAV_MEMBER)[number]['key'];

export function navItems(
  loggedIn: boolean,
): readonly { href: string; key: NavKey }[] {
  return loggedIn ? NAV_MEMBER : NAV_GUEST;
}

export function accountHref(loggedIn: boolean): '/compte' | '/connexion' {
  return loggedIn ? '/compte' : '/connexion';
}

export function accountKey(loggedIn: boolean): 'nav.account' | 'nav.login' {
  return loggedIn ? 'nav.account' : 'nav.login';
}

/** Pied de page en trois colonnes (STRUCTURE.md §2). */
export const FOOTER_COLUMNS = [
  {
    key: 'footer.col.product',
    links: [
      { href: '/methode', key: 'nav.how' },
      { href: '/exemple-rapport', key: 'nav.example' },
      { href: '/pro', key: 'nav.pricing' },
      { href: SCAN_HREF, key: 'nav.scan' },
    ],
  },
  {
    key: 'footer.col.transparency',
    links: [
      { href: '/robot', key: 'footer.robot' },
      { href: '/ecoconception', key: 'footer.eco' },
      { href: '/accessibilite', key: 'footer.a11y' },
    ],
  },
  {
    key: 'footer.col.legal',
    links: [
      { href: '/mentions-legales', key: 'footer.mentions' },
      { href: '/cgu', key: 'footer.terms' },
      { href: '/confidentialite', key: 'footer.privacy' },
      { href: '/cookies', key: 'footer.cookies' },
    ],
  },
] as const;
