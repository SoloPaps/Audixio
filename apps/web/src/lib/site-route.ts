/**
 * Adresses de la page d’un site (docs/design/v6/STRUCTURE.md §4) :
 * `/sites/:host`, sections `#audits`, `#historique`, `#verification`,
 * `#partage`. Les anciens liens à identifiant passent par `/sites/id/:site`.
 */

export const SITE_SECTIONS = [
  'audits',
  'historique',
  'verification',
  'partage',
] as const;

export type SiteSection = (typeof SITE_SECTIONS)[number];

/** Hôte tel qu’enregistré (`exemple.fr`, `www.exemple.fr:8080`). */
const HOST =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/iu;

const SITE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function isSiteHost(value: string): boolean {
  return (
    value.length <= 253 &&
    HOST.test(value) &&
    value !== 'id' &&
    value !== 'fiche'
  );
}

export function isSiteId(value: string): boolean {
  return SITE_ID.test(value);
}

export function siteHref(host: string, section?: SiteSection): string {
  const base = `/sites/${encodeURIComponent(host.toLowerCase())}`;
  return section ? `${base}#${section}` : base;
}

/** Adresse du résolveur, pour un lien qui n’a que l’identifiant du site. */
export function siteIdHref(siteId: string, section?: SiteSection): string {
  const base = `/sites/id/${encodeURIComponent(siteId)}`;
  return section ? `${base}#${section}` : base;
}

export type SiteRoute =
  | { kind: 'host'; host: string }
  | { kind: 'id'; id: string }
  | { kind: 'none' };

/** Lit `/sites/:host` ou `/sites/id/:site` (barre finale tolérée). */
export function parseSiteRoute(pathname: string): SiteRoute {
  const parts = pathname
    .replace(/\/index\.html$/u, '')
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return '';
      }
    });
  if (parts[0] !== 'sites') return { kind: 'none' };
  if (parts.length === 3 && parts[1] === 'id' && isSiteId(parts[2] ?? ''))
    return { kind: 'id', id: (parts[2] ?? '').toLowerCase() };
  if (parts.length === 2 && isSiteHost(parts[1] ?? ''))
    return { kind: 'host', host: (parts[1] ?? '').toLowerCase() };
  return { kind: 'none' };
}

/** Section demandée par l’ancre, sinon la première. */
export function sectionOf(hash: string): SiteSection {
  const id = hash.replace(/^#/u, '');
  return (SITE_SECTIONS as readonly string[]).includes(id)
    ? (id as SiteSection)
    : 'audits';
}
