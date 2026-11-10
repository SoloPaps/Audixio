/** Identifiant d’un constat dans le hash d’une page domaine. */
export function findingHashId(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith('finding-')) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function cssEscape(value: string): string {
  const css = (
    globalThis as unknown as {
      CSS?: { escape?: (value: string) => string };
    }
  ).CSS;
  if (css && typeof css.escape === 'function') return css.escape(value);
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

interface FindingTarget {
  closest: (selector: string) => { open: boolean } | null;
  scrollIntoView: (options?: { block?: string }) => void;
}

/** Ouvre le constat ciblé et le fait défiler dans la vue. */
export function applyFindingHash(
  root: { querySelector: (selector: string) => FindingTarget | null },
  hash: string,
): boolean {
  const id = findingHashId(hash);
  if (!id) return false;
  const target = root.querySelector(`#${cssEscape(id)}`);
  if (!target || typeof target.scrollIntoView !== 'function') return false;
  const details = target.closest('details');
  if (details) details.open = true;
  target.scrollIntoView({ block: 'start' });
  return true;
}
