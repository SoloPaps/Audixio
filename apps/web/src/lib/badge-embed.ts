export type BadgeStyle = 'complet' | 'compact' | 'pastille';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Code du badge : chaque style a son propre fragment.
 * Complet : logo, libellé et note. Compact : logo et « Audixio : B » sur une ligne.
 */
export function badgeEmbed(input: {
  style: BadgeStyle;
  href: string;
  origin: string;
  alt: string;
  /** Libellé du style complet (« Audité par Audixio »). */
  label?: string;
  /** Lettre de la note, absente pour un site non vérifié. */
  grade?: string | null;
}): string {
  const href = input.href;
  const alt = input.alt;
  const logo = `${input.origin}/marque/logo-mobile.svg`;
  if (input.style === 'pastille') {
    return `<a href="${href}" style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#3d52a0;color:#fff;font:700 14px sans-serif;text-decoration:none">${alt}</a>`;
  }
  const grade = input.grade
    ? `<b style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 6px;border-radius:8px;background:#3d52a0;color:#fff;font:800 18px sans-serif">${esc(input.grade)}</b>`
    : '';
  if (input.style === 'complet') {
    const label = esc(input.label ?? alt);
    return `<a href="${href}" aria-label="${esc(alt)}" style="display:inline-flex;align-items:center;gap:10px;padding:6px 14px 6px 6px;border:1px solid #adbbda;border-radius:14px;background:#fff;color:#1e2a55;font:600 14px/1.2 sans-serif;text-decoration:none">\n  <img src="${logo}" alt="" width="48" height="48">\n  <span>${label}</span>${grade ? `\n  ${grade}` : ''}\n</a>`;
  }
  return `<a href="${href}" style="display:inline-flex;align-items:center;gap:8px;padding:0 12px 0 0;color:#1e2a55;font:600 13px sans-serif;text-decoration:none">\n  <img src="${logo}" alt="" width="40" height="40">\n  <span>${esc(alt)}</span>\n</a>`;
}

/** Le lien public du badge ne retombe pas sur le rapport privé. */
export function badgePublicHref(
  origin: string,
  shareToken: string | null,
): string {
  if (!shareToken) return '';
  return `${origin}/partage/${shareToken}`;
}
