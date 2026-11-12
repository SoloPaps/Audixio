/**
 * Table unique des anciennes adresses (docs/design/v6/STRUCTURE.md §4).
 * Le build l’écrit en `dist/_redirects` (Netlify) et le serveur de dev
 * (donc les e2e) applique la même table : une seule source.
 *
 * Les règles à plusieurs paramètres passent avant celles à un paramètre.
 * Les paramètres non repris sont gardés dans l’adresse d’arrivée.
 */

export interface RedirectRule {
  /** Repère de STRUCTURE.md (R1…R17). */
  code: string;
  from: string;
  /** Paramètre de requête → nom de la variable dans `to`. */
  query: Readonly<Record<string, string>>;
  to: string;
}

export interface RewriteRule {
  /** Motif Netlify : `:id` = un segment, `*` = la suite. */
  from: string;
  /** Page statique servie (sans changer l’adresse). */
  to: string;
}

export const REDIRECTS: readonly RedirectRule[] = [
  {
    code: 'R2',
    from: '/rapport',
    query: { id: 'id', domaine: 'd' },
    to: '/rapport/:id/domaines/:d',
  },
  {
    code: 'R3',
    from: '/rapport',
    query: { id: 'id', check: 'c' },
    to: '/rapport/:id/constats/:c',
  },
  {
    code: 'R4',
    from: '/domaine',
    query: { id: 'id', domaine: 'd' },
    to: '/rapport/:id/domaines/:d',
  },
  {
    code: 'R6',
    from: '/constat',
    query: { id: 'id', check: 'c' },
    to: '/rapport/:id/constats/:c',
  },
  { code: 'R1', from: '/rapport', query: { id: 'id' }, to: '/rapport/:id' },
  {
    code: 'R5',
    from: '/domaine',
    query: { id: 'id' },
    to: '/rapport/:id/domaines',
  },
  {
    code: 'R7',
    from: '/constat',
    query: { id: 'id' },
    to: '/rapport/:id/constats',
  },
  { code: 'R8', from: '/plan', query: { id: 'id' }, to: '/rapport/:id/plan' },
  { code: 'R9', from: '/brief', query: { id: 'id' }, to: '/rapport/:id/brief' },
  {
    code: 'R10',
    from: '/rapport/imprimer',
    query: { id: 'id' },
    to: '/rapport/:id/imprimer',
  },
  {
    code: 'R13',
    from: '/badge',
    query: { id: 'id' },
    to: '/rapport/:id?partager=badge',
  },
  // Sans identifiant : la page de l’onglet, qui invite à choisir un rapport
  // (ou demande la connexion), comme les anciennes pages.
  {
    code: 'R4–R9 sans id',
    from: '/domaine',
    query: {},
    to: '/rapport/domaines',
  },
  {
    code: 'R6–R7 sans id',
    from: '/constat',
    query: {},
    to: '/rapport/constats',
  },
  { code: 'R8 sans id', from: '/plan', query: {}, to: '/rapport/plan' },
  { code: 'R9 sans id', from: '/brief', query: {}, to: '/rapport/brief' },
  { code: 'R13 sans id', from: '/badge', query: {}, to: '/rapport/badge' },
];

/** Onglets du rapport : une page statique par onglet, adresse inchangée. */
export const REWRITES: readonly RewriteRule[] = [
  { from: '/rapport/:id/domaines', to: '/rapport/domaines/index.html' },
  { from: '/rapport/:id/domaines/*', to: '/rapport/domaines/index.html' },
  { from: '/rapport/:id/constats', to: '/rapport/constats/index.html' },
  { from: '/rapport/:id/constats/*', to: '/rapport/constats/index.html' },
  { from: '/rapport/:id/plan', to: '/rapport/plan/index.html' },
  { from: '/rapport/:id/brief', to: '/rapport/brief/index.html' },
  { from: '/rapport/:id/badge', to: '/rapport/badge/index.html' },
  { from: '/rapport/:id/imprimer', to: '/rapport/imprimer/index.html' },
  { from: '/rapport/:id', to: '/rapport/index.html' },
];

/** Pages statiques sous /rapport/ : jamais prises pour un identifiant. */
const STATIC = new Set([
  'domaines',
  'constats',
  'plan',
  'brief',
  'badge',
  'imprimer',
  'index.html',
]);

function clean(pathname: string): string {
  const bare = pathname.replace(/\/index\.html$/u, '').replace(/\/+$/u, '');
  return bare === '' ? '/' : bare;
}

/** Adresse d’arrivée (chemin + requête), ou null si l’adresse est à jour. */
export function resolveRedirect(
  pathname: string,
  search: string,
): string | null {
  const path = clean(pathname);
  const params = new URLSearchParams(search);
  for (const rule of REDIRECTS) {
    if (rule.from !== path) continue;
    const keys = Object.keys(rule.query);
    if (!keys.every((key) => (params.get(key) ?? '') !== '')) continue;
    let target = rule.to;
    for (const key of keys) {
      const name = rule.query[key] ?? key;
      target = target.replace(
        `:${name}`,
        encodeURIComponent(params.get(key) ?? ''),
      );
    }
    const rest = new URLSearchParams();
    for (const [key, value] of params) {
      if (!keys.includes(key)) rest.append(key, value);
    }
    const [base, own = ''] = target.split('?');
    const merged = new URLSearchParams(own);
    for (const [key, value] of rest) merged.append(key, value);
    const query = merged.toString();
    return query ? `${base}?${query}` : (base ?? target);
  }
  return null;
}

/** Page statique à servir pour une adresse d’onglet, sinon null. */
export function resolveRewrite(pathname: string): string | null {
  const parts = clean(pathname).split('/').filter(Boolean);
  if (parts[0] !== 'rapport' || parts.length < 2) return null;
  const id = parts[1] ?? '';
  if (STATIC.has(id)) return null;
  for (const rule of REWRITES) {
    const pattern = rule.from.split('/').filter(Boolean);
    const splat = pattern[pattern.length - 1] === '*';
    const fixed = splat ? pattern.slice(0, -1) : pattern;
    if (splat ? parts.length <= fixed.length : parts.length !== fixed.length)
      continue;
    if (fixed.every((seg, i) => seg.startsWith(':') || seg === parts[i]))
      return rule.to;
  }
  return null;
}

/** Contenu de `dist/_redirects` (Netlify lit ce fichier avant netlify.toml). */
export function renderRedirects(): string {
  const lines = [
    '# Généré depuis apps/web/src/lib/redirects.ts. Ne pas éditer à la main.',
  ];
  for (const rule of REDIRECTS) {
    const query = Object.entries(rule.query)
      .map(([key, name]) => `${key}=:${name}`)
      .join(' ');
    for (const from of [rule.from, `${rule.from}/`]) {
      lines.push([from, query, rule.to, '301!'].filter(Boolean).join(' '));
    }
  }
  for (const rule of REWRITES) lines.push(`${rule.from} ${rule.to} 200`);
  return `${lines.join('\n')}\n`;
}
