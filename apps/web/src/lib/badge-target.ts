/** Lien du code de badge. */
export function badgeTargetHref(input: {
  origin: string;
  shareToken: string | null;
  auditId: string;
}): string {
  if (input.shareToken) return `${input.origin}/partage/${input.shareToken}`;
  return `${input.origin}/exemple-rapport`;
}
