/** Progression du bon audit : l’id renvoyé, jamais un ancien rapport. */
export function progressionHref(auditId: string): string {
  return `/progression?id=${encodeURIComponent(auditId)}`;
}

/** Nouvelle demande : directement la progression, sans page /lancer. */
export function relaunchHref(siteId: string, url?: string): string {
  const params = new URLSearchParams();
  params.set('site', siteId);
  if (url) params.set('url', url);
  return `/progression?${params.toString()}`;
}

/** Relance du même site. Sans site, l’accueil — jamais `/progression` nu. */
export function retryHref(site: { id: string; url: string } | null): string {
  return site ? relaunchHref(site.id, site.url) : '/';
}
