import type { rapport6Fr } from './rapport6-fr.js';

/** Anglais des clés rp.*. Recopié dans dictionnaire-en.json. */
export const rapport6En: { [K in keyof typeof rapport6Fr]: string } = {
  'rp.tabs.label': 'Report sections',
  'rp.tab.resume': 'Summary',
  'rp.tab.domaines': 'Areas',
  'rp.tab.constats': 'Findings',
  'rp.tab.plan': 'Action plan',
  'rp.tab.brief': 'Brief',
  'rp.tab.imprimer': 'Print / PDF',
  'rp.domaines.title': 'Report areas',
  'rp.domaines.lead': 'Pick an area to read its findings and what to fix.',
  'rp.domaines.locked': 'Reserved',
  'rp.domaines.untested': 'Not tested',
  'rp.constats.title': 'Report findings',
  'rp.constats.lead':
    'Every issue found, with its area. Open one to read the detail and the fix.',
  'rp.constats.empty': 'Nothing to fix in this report.',
  'rp.constats.count': '{n} issues to fix',
  'rp.constats.one': '1 issue to fix',
  'rp.share.choices': 'What do you want to share?',
  'rp.share.link.hint':
    'A read-only page, no account needed, that you can take down.',
  'rp.share.pdf': 'Export as PDF',
  'rp.share.pdf.hint': 'The printable version of the report, to save as PDF.',
};
