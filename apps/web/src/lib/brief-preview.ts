import { briefEn, briefServerEn } from '../i18n/brief-en.js';
import { briefFr } from '../i18n/brief-fr.js';
import { fr } from '../i18n/index.js';

/**
 * Aperçu lisible du prompt IA (décision du propriétaire, 6 nov.) : le texte
 * reste exactement celui du fichier exporté, seules les lignes reçoivent une
 * classe (titre, section, puce, détail, note) pour la hiérarchie visuelle.
 */

export type BriefLineKind =
  | 'title'
  | 'section'
  | 'item'
  | 'detail'
  | 'note'
  | 'gap';

export interface BriefLine {
  kind: BriefLineKind;
  text: string;
}

function isBullet(line: string | undefined): boolean {
  return line?.startsWith('- ') === true;
}

/** Classe chaque ligne du brief sans en changer le texte. */
export function classifyBriefLines(text: string): BriefLine[] {
  const lines = text.replace(/\n+$/, '').split('\n');
  const firstIndex = lines.findIndex((line) => line.trim() !== '');
  return lines.map((line, index) => {
    if (line.trim() === '') return { kind: 'gap', text: line };
    if (index === firstIndex) return { kind: 'title', text: line };
    if (line.startsWith('  - ')) return { kind: 'detail', text: line };
    if (isBullet(line)) return { kind: 'item', text: line };
    if (isBullet(lines[index + 1])) return { kind: 'section', text: line };
    return { kind: 'note', text: line };
  });
}

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export interface BriefTags {
  /** Libellés qui demandent une correction (« Corriger », « Fix »). */
  fix: readonly string[];
  /** Libellés de vérification (« Vérifier », « Vérif », « Check »). */
  check: readonly string[];
}

function itemHtml(body: string, tags: BriefTags): string {
  const cut = body.lastIndexOf(' — ');
  if (cut !== -1) {
    const label = body.slice(cut + 3);
    const tone = tags.fix.includes(label)
      ? 'fix'
      : tags.check.includes(label)
        ? 'check'
        : null;
    if (tone !== null) {
      return `<span class="l-t">${esc(body.slice(0, cut))}</span><span class="l-dash"> — </span><span class="l-tag ${tone}">${esc(label)}</span>`;
    }
  }
  return esc(body);
}

function detailHtml(body: string): string {
  const cut = body.indexOf(' : ');
  if (cut > 0 && cut <= 24) {
    return `<span class="l-k">${esc(body.slice(0, cut))}</span>${esc(body.slice(cut))}`;
  }
  return esc(body);
}

/** HTML de l’aperçu : une ligne par div, texte échappé, rien d’ajouté. */
export function briefPreviewHtml(text: string, tags: BriefTags): string {
  return classifyBriefLines(text)
    .map((line) => {
      switch (line.kind) {
        case 'gap':
          return '<div class="l l-gap"></div>';
        case 'title':
          return `<div class="l l-h1">${esc(line.text)}</div>`;
        case 'section':
          return `<div class="l l-h2">${esc(line.text)}</div>`;
        case 'note':
          return `<div class="l l-n">${esc(line.text)}</div>`;
        case 'item':
          return `<div class="l l-b"><span class="l-m">- </span>${itemHtml(line.text.slice(2), tags)}</div>`;
        default:
          return `<div class="l l-d"><span class="l-m">  - </span>${detailHtml(line.text.slice(4))}</div>`;
      }
    })
    .join('');
}

/** Libellés de statut du brief, dans les deux langues du fichier. */
export const BRIEF_TAGS: BriefTags = {
  fix: [
    fr['brief.act.fix'],
    briefServerEn['brief.act.fix'],
    briefFr['brief.terminal.fix'],
    briefEn['brief.terminal.fix'],
  ],
  check: [
    fr['brief.act.check'],
    briefServerEn['brief.act.check'],
    briefFr['brief.terminal.verif'],
    briefEn['brief.terminal.verif'],
  ],
};
