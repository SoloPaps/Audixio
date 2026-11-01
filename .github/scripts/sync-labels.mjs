import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../labels.yml', import.meta.url));

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseLabels(text) {
  const labels = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const name = line.match(/^- name:\s+(.+)$/);
    if (name) {
      current = { name: unquote(name[1]) };
      labels.push(current);
      continue;
    }
    if (!current) throw new Error(`ligne hors étiquette : ${raw}`);
    const color = line.match(/^color:\s+(.+)$/);
    if (color) {
      current.color = unquote(color[1]).replace(/^#/, '').toLowerCase();
      continue;
    }
    const description = line.match(/^description:\s+(.+)$/);
    if (description) {
      current.description = unquote(description[1]);
      continue;
    }
    throw new Error(`ligne inattendue : ${raw}`);
  }
  const seen = new Set();
  for (const label of labels) {
    if (!label.name) throw new Error('étiquette sans nom');
    if (seen.has(label.name)) throw new Error(`étiquette en double : ${label.name}`);
    seen.add(label.name);
    if (!/^[0-9a-f]{6}$/.test(label.color ?? '')) {
      throw new Error(`couleur invalide pour ${label.name}`);
    }
    if (!label.description) throw new Error(`description manquante pour ${label.name}`);
  }
  return labels;
}

function upsert(label) {
  execFileSync(
    'gh',
    [
      'label',
      'create',
      label.name,
      '--color',
      label.color,
      '--description',
      label.description,
      '--force',
    ],
    { stdio: 'inherit' },
  );
}

const checkOnly = process.argv.includes('--check');
const labels = parseLabels(readFileSync(file, 'utf8'));
if (checkOnly) {
  console.log(`${labels.length} étiquettes valides`);
} else {
  for (const label of labels) upsert(label);
}
