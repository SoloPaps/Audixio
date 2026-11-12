/**
 * Adresses du rapport v6 (docs/design/v6/STRUCTURE.md §3) : une adresse par
 * audit, un onglet par sous-chemin. Les anciennes adresses à requête
 * (/rapport?id=, /domaine?id=…) restent lues pour les liens déjà envoyés,
 * mais toutes les adresses produites ici sont les nouvelles.
 */

export const REPORT_TABS = [
  'resume',
  'domaines',
  'constats',
  'plan',
  'brief',
  'imprimer',
] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export interface ReportRoute {
  id: string;
  tab: ReportTab;
  /** Domaine ouvert dans l’onglet Domaines, sinon ''. */
  domain: string;
  /** Constat ouvert dans l’onglet Constats, sinon ''. */
  check: string;
}

const enc = encodeURIComponent;

function seg(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/** /rapport/:id[/domaines[/:d] | /constats[/:c] | /plan | /brief | /imprimer]. */
export function reportHref(
  id: string,
  tab: ReportTab = 'resume',
  sub = '',
): string {
  const base = `/rapport/${enc(id)}`;
  if (tab === 'resume') return base;
  if ((tab === 'domaines' || tab === 'constats') && sub)
    return `${base}/${tab}/${enc(sub)}`;
  return `${base}/${tab}`;
}

export function domainHref(id: string, domain = ''): string {
  return reportHref(id, 'domaines', domain);
}

export function checkHref(id: string, check = ''): string {
  return reportHref(id, 'constats', check);
}

/** Feuille Partager ouverte sur un choix (R13 : badge). */
export function shareHref(
  id: string,
  choice: 'lien' | 'badge' | 'pdf',
): string {
  return `${reportHref(id)}?partager=${choice}`;
}

/** Page du badge (ouverte depuis la feuille Partager). */
export function badgePageHref(id: string): string {
  return `/rapport/${enc(id)}/badge`;
}

const PATH =
  /^\/rapport\/([^/]+)(?:\/(domaines|constats|plan|brief|imprimer|badge)(?:\/([^/]+))?)?\/?$/u;
const RESERVED = new Set([
  'domaines',
  'constats',
  'plan',
  'brief',
  'imprimer',
  'badge',
  'index',
  'index.html',
]);

/**
 * Lit l’adresse courante. Le chemin l’emporte ; sinon les anciennes requêtes
 * (`?id=`, `&domaine=`, `&check=`) de /rapport, /domaine, /constat, /plan,
 * /brief et /badge.
 */
export function parseReportRoute(
  pathname: string,
  search: string,
): ReportRoute & { badge: boolean } {
  const query = new URLSearchParams(search);
  const match = PATH.exec(pathname);
  if (match?.[1] && !RESERVED.has(match[1])) {
    const id = seg(match[1]);
    const part = match[2] ?? '';
    const sub = seg(match[3] ?? '');
    const tab: ReportTab =
      part === '' || part === 'badge' ? 'resume' : (part as ReportTab);
    return {
      id,
      tab,
      domain: tab === 'domaines' ? sub : '',
      check: tab === 'constats' ? sub : '',
      badge: part === 'badge',
    };
  }
  const id = query.get('id') ?? '';
  const page = pathname.replace(/\/+$/u, '').split('/').pop() ?? '';
  const legacy: Record<string, ReportTab> = {
    domaine: 'domaines',
    domaines: 'domaines',
    constat: 'constats',
    constats: 'constats',
    plan: 'plan',
    brief: 'brief',
    imprimer: 'imprimer',
  };
  const tab = legacy[page] ?? 'resume';
  return {
    id,
    tab,
    domain: tab === 'domaines' ? (query.get('domaine') ?? '') : '',
    check: tab === 'constats' ? (query.get('check') ?? '') : '',
    badge: page === 'badge',
  };
}
