export type BadgeStyle = 'complet' | 'compact' | 'pastille';

/** Code du badge : chaque style a son propre fragment. */
export function badgeEmbed(input: {
  style: BadgeStyle;
  href: string;
  origin: string;
  alt: string;
}): string {
  const href = input.href;
  const alt = input.alt;
  const logo = `${input.origin}/marque/logo-mobile.svg`;
  if (input.style === 'pastille') {
    return `<a href="${href}" style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#3d52a0;color:#fff;font:700 14px sans-serif;text-decoration:none">${alt}</a>`;
  }
  const height = input.style === 'complet' ? 48 : 40;
  const width = input.style === 'complet' ? 180 : 120;
  return `<a href="${href}">\n  <img src="${logo}" alt="${alt}" width="${width}" height="${height}">\n</a>`;
}

/** Le lien public du badge ne retombe pas sur le rapport privé. */
export function badgePublicHref(
  origin: string,
  shareToken: string | null,
): string {
  if (!shareToken) return '';
  return `${origin}/partage/${shareToken}`;
}
