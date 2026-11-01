import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const FILES = {
  hub: 'docs/design/maquettes/finales/page_rapport_hub/page_rapport_hub.html',
  domaine: 'docs/design/maquettes/finales/page_rapport_domaine/page_rapport_domaine.html',
  restreint: 'docs/design/maquettes/finales/page_domaine_restreint/page_domaine_restreint.html',
  preuve: 'docs/design/maquettes/finales/page_verifier_propriete/page_verifier_propriete.html',
} as const;

export type MaquetteId = keyof typeof FILES;

/** Document de maquette, logos servis par l’app, scripts retirés pour un rendu stable. */
export function maquetteDocument(id: MaquetteId): string {
  const raw = readFileSync(resolve(root, FILES[id]), 'utf8');
  return raw
    .replaceAll(
      '../../../logos/audixio-logo-pc-clair.svg',
      '/marque/logo-pc.svg',
    )
    .replaceAll(
      '../../../logos/audixio-logo-mobile-clair.svg',
      '/marque/logo-mobile.svg',
    )
    .replaceAll('<script', '<script type="application/maquette-off"');
}
