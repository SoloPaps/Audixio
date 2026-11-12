import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Les règles générales de v6.css (.btn, .nav, .row, .field…) ne doivent pas
// écraser la feuille d’une page portée (racine [data-port]) : dans une portée,
// elles ne pèsent qu’une classe ; ailleurs, elles gardent leur poids.
const css = readFileSync('apps/web/src/styles/v6.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

function selectors(): string[] {
  const out: string[] = [];
  for (const match of css.matchAll(/(^|[{};])([^{};@]+)\{/g)) {
    const prelude = match[2]?.trim() ?? '';
    if (!prelude.includes('[data-v6]')) continue;
    let depth = 0;
    let cur = '';
    for (const ch of prelude) {
      if (ch === '(' || ch === '[') depth += 1;
      if (ch === ')' || ch === ']') depth -= 1;
      if (ch === ',' && depth === 0) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
  }
  return out;
}

const NATIVE = ':where(:not([data-port] *))';
const PORTED = ':where([data-v6] [data-port]) ';

describe('règles générales de v6.css et pages portées', () => {
  const all = selectors().map((sel) =>
    sel.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')'),
  );

  it('chaque règle « [data-v6] X » épargne les portées [data-port]', () => {
    const loose = all.filter(
      (sel) =>
        sel.startsWith('[data-v6] ') &&
        !/^\[data-v6\] (body|html)\b/.test(sel) &&
        !sel.includes(NATIVE),
    );
    expect(loose).toEqual([]);
  });

  it('chaque règle a sa jumelle de poids faible dans les portées', () => {
    const native = all.filter(
      (sel) => sel.startsWith('[data-v6] ') && sel.includes(NATIVE),
    );
    expect(native.length).toBeGreaterThan(100);
    const ported = new Set(all.filter((sel) => sel.startsWith(PORTED)));
    // .card n’a pas de jumelle : les cartes des pages portées gardent leur dessin.
    const missing = native
      .filter(
        (sel) =>
          !/^\[data-v6\] :where\(:not\(\[data-port\] \*\)\)\.card\b/.test(sel),
      )
      .map(
        (sel) =>
          `${PORTED}${sel.slice('[data-v6] '.length).replace(NATIVE, '')}`,
      )
      .filter((twin) => !ported.has(twin));
    expect(missing).toEqual([]);
  });

  it('les sélecteurs .btn et .nav existent sous les deux formes', () => {
    for (const piece of ['.btn', '.nav']) {
      expect(all).toContain(`[data-v6] ${piece}${NATIVE}`);
      expect(all).toContain(`${PORTED}${piece}`);
    }
  });
});
