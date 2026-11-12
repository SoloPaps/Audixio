/** Port du serveur e2e : E2E_PORT, 4321 par défaut. */
export const E2E_PORT = process.env.E2E_PORT || '4321';
export const HOST = `127.0.0.1:${E2E_PORT}`;
export const ORIGIN = `http://${HOST}`;

/** Échappe un texte pour l’insérer dans une RegExp. */
export function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
