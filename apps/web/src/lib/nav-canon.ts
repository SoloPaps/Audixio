/** Entrées de la barre actuelle, dans l’ordre. Le chrome v6 reprend cette liste. */
export const NAV_ITEMS = [
  { href: '/', key: 'nav.home' },
  { href: '/methode', key: 'nav.method' },
  { href: '/sites', key: 'nav.sites.long' },
  { href: '/pro', key: 'nav.pricing' },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]['key'];

export function accountHref(loggedIn: boolean): '/compte' | '/connexion' {
  return loggedIn ? '/compte' : '/connexion';
}

export function accountKey(loggedIn: boolean): 'nav.account' | 'nav.login' {
  return loggedIn ? 'nav.account' : 'nav.login';
}
