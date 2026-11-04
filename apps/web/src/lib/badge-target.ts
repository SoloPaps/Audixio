/** Lien du badge : partage public, sinon le rapport de cet audit. */
export function badgeTargetHref(input: {
  origin: string;
  shareToken: string | null;
  auditId: string;
}): string {
  if (input.shareToken)
    return `${input.origin}/partage/${encodeURIComponent(input.shareToken)}`;
  return `${input.origin}/rapport?id=${encodeURIComponent(input.auditId)}`;
}
