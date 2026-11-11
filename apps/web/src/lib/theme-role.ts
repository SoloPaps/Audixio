/**
 * Couleur d'un rôle du thème sombre (styles/theme-dark.css) pour ce que le CSS
 * ne peint pas, comme un canvas. Hors thème sombre : la couleur claire.
 */
export function roleColor(role: string, light: string): string {
  if (typeof document === 'undefined') return light;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--d-${role}`)
    .trim();
  return value || light;
}
