import { type FixSheet, parseFix, variantFor } from '@audigy/engine/fixes';
import { packActive, packLine } from '../i18n/pack.js';
import { stepsFromVariant } from './fix-steps.js';
import type { FixView } from './report-model.js';

type Hosting = 'netlify' | 'github_pages' | 'other';

const files = import.meta.glob('../../../../packages/engine/fixes/fr/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

let sheets: Map<string, FixSheet> | null = null;
const viewCache = new Map<string, Map<string, FixView>>();

function allSheets(): Map<string, FixSheet> {
  if (sheets) return sheets;
  const next = new Map<string, FixSheet>();
  for (const [file, text] of Object.entries(files)) {
    const name = file.split('/').pop()?.replace(/\.md$/u, '');
    if (!name || typeof text !== 'string') continue;
    next.set(name, parseFix(name, text));
  }
  sheets = next;
  return next;
}

export function hostingOf(value: string): Hosting {
  if (value === 'netlify' || value === 'github_pages') return value;
  return 'other';
}

/**
 * Titre et raison d’une fiche dans la langue active.
 * Le catalogue anglais vit dans le dictionnaire EN (clés `fix.<checkId>.*`).
 * Une ligne absente garde le texte français de la fiche.
 */
export function localizedSheet(
  id: string,
  sheet: Pick<FixSheet, 'title' | 'why'>,
): { title: string; why: string } {
  return {
    title: packLine(`fix.${id}.title`) ?? sheet.title,
    why: packLine(`fix.${id}.why`) ?? sheet.why,
  };
}

export function fixesFor(hosting: Hosting): Map<string, FixView> {
  const cacheKey = `${hosting}:${packActive() ? 'en' : 'fr'}`;
  const cached = viewCache.get(cacheKey);
  if (cached) return cached;
  const views = new Map<string, FixView>();
  for (const [id, sheet] of allSheets()) {
    const parsed = stepsFromVariant(variantFor(sheet, hosting));
    const source = sheet.sources[0];
    const copy = localizedSheet(id, sheet);
    const view: FixView = {
      title: copy.title,
      why: copy.why,
      effortMinutes: sheet.effortMinutes,
      steps: parsed.steps,
    };
    if (parsed.code) view.code = parsed.code;
    if (source) {
      view.sourceLabel = source.label;
      view.sourceHref = source.url;
    }
    views.set(id, view);
  }
  viewCache.set(cacheKey, views);
  return views;
}
