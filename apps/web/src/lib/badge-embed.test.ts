import { describe, expect, it } from 'vitest';
import { badgeEmbed, badgePublicHref } from './badge-embed.js';

describe('badge', () => {
  it('change le code selon le style choisi', () => {
    const complet = badgeEmbed({
      style: 'complet',
      href: 'https://audixio.fr/partage/abc',
      origin: 'https://audixio.fr',
      alt: 'Audixio',
    });
    const compact = badgeEmbed({
      style: 'compact',
      href: 'https://audixio.fr/partage/abc',
      origin: 'https://audixio.fr',
      alt: 'Audixio',
    });
    const pastille = badgeEmbed({
      style: 'pastille',
      href: 'https://audixio.fr/partage/abc',
      origin: 'https://audixio.fr',
      alt: 'Audixio',
    });
    expect(complet).toContain('height="48"');
    expect(compact).toContain('height="40"');
    expect(compact).not.toContain('height="48"');
    expect(pastille).toContain('border-radius:999px');
    expect(pastille).not.toContain('<img');
    expect(complet).not.toBe(compact);
    expect(compact).not.toBe(pastille);
  });

  it('pointe le lien public vers la version publique', () => {
    expect(badgePublicHref('https://audixio.fr', 'abc')).toBe(
      'https://audixio.fr/partage/abc',
    );
    expect(badgePublicHref('https://audixio.fr', null)).toBe('');
    expect(badgePublicHref('https://audixio.fr', null)).not.toContain(
      '/rapport',
    );
  });
});
