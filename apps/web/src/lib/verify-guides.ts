import type { MessageKey } from '../i18n/index.js';

export type VerifyMethod =
  | 'dns_txt'
  | 'file'
  | 'html_file'
  | 'meta'
  | 'well_known'
  | 'search_console';

export interface Guide {
  title: MessageKey;
  steps: readonly MessageKey[];
}

const NETLIFY: Guide = {
  title: 'verify.guide.netlify.title',
  steps: [
    'verify.guide.netlify.1',
    'verify.guide.netlify.2',
    'verify.guide.netlify.3',
    'verify.guide.netlify.4',
    'verify.guide.netlify.5',
  ],
};

const REGISTRAR: Guide = {
  title: 'verify.guide.registrar.title',
  steps: [
    'verify.guide.registrar.1',
    'verify.guide.registrar.2',
    'verify.guide.registrar.3',
    'verify.guide.registrar.4',
    'verify.guide.registrar.5',
  ],
};

const GITHUB: Guide = {
  title: 'verify.guide.github.title',
  steps: [
    'verify.guide.github.1',
    'verify.guide.github.2',
    'verify.guide.github.3',
    'verify.guide.github.4',
    'verify.guide.github.5',
    'verify.guide.github.6',
  ],
};

const FILE: Guide = {
  title: 'verify.guide.file.title',
  steps: [
    'verify.guide.file.1',
    'verify.guide.file.2',
    'verify.guide.file.3',
    'verify.guide.file.4',
  ],
};

const META: Guide = {
  title: 'verify.guide.meta.title',
  steps: [
    'verify.guide.meta.1',
    'verify.guide.meta.2',
    'verify.guide.meta.3',
    'verify.guide.meta.4',
  ],
};

const HTML_FILE: Guide = {
  title: 'verify.guide.html.title',
  steps: [
    'verify.guide.html.1',
    'verify.guide.html.2',
    'verify.guide.html.3',
    'verify.guide.html.4',
  ],
};

const WELL_KNOWN: Guide = {
  title: 'verify.guide.well_known.title',
  steps: [
    'verify.guide.well_known.1',
    'verify.guide.well_known.2',
    'verify.guide.well_known.3',
  ],
};

/** Instructions selon la méthode. Le DNS couvre Netlify et le registrar. */
export function guidesFor(method: VerifyMethod): readonly Guide[] {
  if (method === 'dns_txt') return [NETLIFY, REGISTRAR];
  if (method === 'file') return [GITHUB, FILE];
  if (method === 'html_file') return [GITHUB, HTML_FILE];
  if (method === 'well_known') return [WELL_KNOWN];
  if (method === 'search_console') return [];
  return [META];
}
