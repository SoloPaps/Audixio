import { GUEST_AUDIT } from './abus.js';

/** Hôtes du Supabase lancé sur la machine. Jamais un projet hébergé. */
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Vrai seulement si l’URL pointe vers la machine locale.
 * Une variable d’environnement ne suffit pas.
 */
export function isLocalSupabaseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return LOCAL_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * Plafond local. `consume_rate_limit` refuse toute valeur au-dessus de 1000
 * (la fonction renvoie false, donc un 429 à chaque audit).
 */
export const GUEST_AUDIT_LOCAL_LIMIT = 1000;

/**
 * 3 audits / 24 h, sauf si le réglage local est demandé ET que l’URL
 * Supabase est locale. Hors local, le réglage est ignoré.
 */
export function guestAuditLimit(input: {
  supabaseUrl: string | null | undefined;
  lift: boolean;
}): number {
  if (input.lift && isLocalSupabaseUrl(input.supabaseUrl)) {
    return GUEST_AUDIT_LOCAL_LIMIT;
  }
  return GUEST_AUDIT.limit;
}

/** Refuse le seed et le contournement dès que l’URL n’est pas locale. */
export function assertLocalSupabase(url: string | null | undefined): void {
  if (!isLocalSupabaseUrl(url)) throw new Error('hors_local');
}
