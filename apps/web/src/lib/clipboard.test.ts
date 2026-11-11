import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard.js';

type Host = { navigator?: unknown; document?: unknown };
const host = globalThis as unknown as Host;
const saved = {
  navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
};

/** Document minimal : une zone de texte ajoutée puis retirée. */
function fakeDocument(copyResult: boolean | 'throw') {
  const nodes: unknown[] = [];
  const area = {
    value: '',
    style: { cssText: '' },
    setAttribute: vi.fn(),
    select: vi.fn(),
    setSelectionRange: vi.fn(),
    remove: () => nodes.splice(nodes.indexOf(area), 1),
  };
  const doc = {
    activeElement: null,
    body: { append: (node: unknown) => nodes.push(node) },
    createElement: () => area,
    execCommand: vi.fn(() => {
      if (copyResult === 'throw') throw new Error('refus');
      return copyResult;
    }),
  };
  return { doc, area, nodes };
}

function install(clipboard: unknown, doc: unknown): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: doc,
    configurable: true,
  });
}

afterEach(() => {
  for (const key of ['navigator', 'document'] as const) {
    const descriptor = saved[key];
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete host[key];
  }
});

describe('copyText (bouton copier, retour owner du 11 nov.)', () => {
  it('passe par l’API presse-papiers quand elle répond', async () => {
    const writeText = vi.fn(async () => undefined);
    const { doc } = fakeDocument(true);
    install({ writeText }, doc);
    await expect(copyText('ABC')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('ABC');
    expect(doc.execCommand).not.toHaveBeenCalled();
  });

  it('se replie sur execCommand quand l’API refuse', async () => {
    const { doc, area, nodes } = fakeDocument(true);
    install(
      {
        writeText: vi.fn(async () => {
          throw new Error('NotAllowedError');
        }),
      },
      doc,
    );
    await expect(copyText('ABC')).resolves.toBe(true);
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
    expect(area.value).toBe('ABC');
    expect(nodes).toEqual([]);
  });

  it('se replie sans API (page en http sur une adresse du réseau local)', async () => {
    const { doc } = fakeDocument(true);
    install(undefined, doc);
    await expect(copyText('ABC')).resolves.toBe(true);
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
  });

  it('dit false quand rien n’est copié : jamais de faux « Copié »', async () => {
    const { doc } = fakeDocument(false);
    install(undefined, doc);
    await expect(copyText('ABC')).resolves.toBe(false);
    const thrown = fakeDocument('throw');
    install(undefined, thrown.doc);
    await expect(copyText('ABC')).resolves.toBe(false);
    expect(thrown.nodes).toEqual([]);
  });
});
