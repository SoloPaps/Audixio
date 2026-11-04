import { describe, expect, it } from 'vitest';
import {
  CMP_SIGNATURES,
  detectCmp,
  PROBE_GLOBALS,
  PROBE_SELECTORS,
} from '../src/cmp.js';

const none = { globals: [], selectors: [] };

describe('détection des plateformes de consentement', () => {
  it.each([
    ['tarteaucitron', 'https://www.exemple.fr/tarteaucitron/tarteaucitron.js'],
    ['axeptio', 'https://static.axept.io/sdk.js'],
    ['didomi', 'https://sdk.privacy-center.org/abc/loader.js?target=x'],
    ['cookiebot', 'https://consent.cookiebot.com/uc.js'],
    ['onetrust', 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js'],
    ['sirdata', 'https://cache.consentframework.com/js/pa/1/c/2/stub'],
    ['usercentrics', 'https://app.usercentrics.eu/browser-ui/latest/loader.js'],
  ])('reconnaît %s par son script', (id, url) => {
    const found = detectCmp([url], none);
    expect(found.map((m) => m.id)).toEqual([id]);
    expect(found[0]?.evidence).toEqual([`script:${url}`]);
  });

  it.each([
    ['tarteaucitron', 'tarteaucitron', '#tarteaucitronRoot'],
    ['axeptio', 'axeptioSettings', '#axeptio_overlay'],
    ['didomi', 'Didomi', '#didomi-host'],
    ['cookiebot', 'Cookiebot', '#CybotCookiebotDialog'],
    ['onetrust', 'OneTrust', '#onetrust-banner-sdk'],
  ])('reconnaît %s par la page (script auto-hébergé)', (id, global, dom) => {
    const found = detectCmp(['https://www.exemple.fr/js/bundle.js'], {
      globals: [global],
      selectors: [dom],
    });
    expect(found).toEqual([
      expect.objectContaining({
        id,
        evidence: [`global:${global}`, `dom:${dom}`],
      }),
    ]);
  });

  it('ne voit rien sur une page sans bandeau', () => {
    expect(
      detectCmp(
        [
          'https://www.exemple.fr/app.js',
          'https://www.googletagmanager.com/gtag/js?id=G-1',
        ],
        none,
      ),
    ).toEqual([]);
  });

  it('rapporte plusieurs plateformes et dédoublonne les preuves', () => {
    const url = 'https://consent.cookiebot.com/uc.js';
    const found = detectCmp([url, url], {
      globals: ['Didomi'],
      selectors: [],
    });
    expect(found.map((m) => m.id)).toEqual(['didomi', 'cookiebot']);
    expect(found[1]?.evidence).toEqual([`script:${url}`]);
  });

  it('sonde chaque variable et sélecteur une seule fois', () => {
    expect(new Set(PROBE_GLOBALS).size).toBe(PROBE_GLOBALS.length);
    expect(new Set(PROBE_SELECTORS).size).toBe(PROBE_SELECTORS.length);
    const ids = CMP_SIGNATURES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'tarteaucitron',
        'axeptio',
        'didomi',
        'cookiebot',
        'onetrust',
      ]),
    );
  });
});

describe('signatures de script ancrées sur l’hôte (code scanning)', () => {
  it.each([
    'https://evil.example/static.axept.io/sdk.js',
    'https://static.axept.io.evil.example/sdk.js',
    'https://evil.example/?u=sdk.privacy-center.org/x.js',
    'https://consent.cookiebot.com.evil.example/uc.js',
    'https://notcdn.cookielaw.org.evil.example/x.js',
    'https://evil.example/cdn.cookielaw.org/x.js',
    'https://evil-onetrust.com/x.js',
    'https://cache.consentframework.com.evil.example/stub',
    'https://evil.example/app.usercentrics.eu/loader.js',
    'https://quantcast.mgr.consensu.org.evil.example/cmp.js',
    'https://cmp.inmobi.com.evil.example/cmp.js',
    'https://cdn.iubenda.com.evil.example/cs.js',
    'https://consent.cookiefirst.com.evil.example/x.js',
    'https://app.termly.io.evil.example/x.js',
    'https://cdn.cookie-script.com.evil.example/s.js',
  ])('ignore l’hôte trompeur %s', (url) => {
    expect(detectCmp([url], none)).toEqual([]);
  });

  it.each([
    ['axeptio', '//static.axept.io/sdk.js'],
    ['axeptio', 'https://client.axept.io/sdk.js'],
    ['cookiebot', 'https://consent.cookiebot.eu/uc.js'],
    ['cookiebot', 'https://consentcdn.cookiebot.com/sdk/bc-v4.min.js'],
    ['onetrust', 'https://geolocation.onetrust.com/cookieconsentpub/v1/geo'],
    ['onetrust', 'https://optanon.blob.core.windows.net/consent/x.json'],
    ['sirdata', 'https://choices.consentframework.com/js/pa/1/c/2/cmp'],
    ['usercentrics', 'https://web.cmp.usercentrics.eu/ui/loader.js'],
    ['quantcast', 'https://quantcast.mgr.consensu.org/choice/x/choice.js'],
    ['quantcast', 'https://cmp.inmobi.com/choice/x/choice.js'],
    ['iubenda', 'https://cs.iubenda.com/autoblocking/1.js'],
    ['cookiefirst', 'https://consent.cookiefirst.com/sites/x/consent.js'],
    ['termly', 'https://app.termly.io/resource-blocker/x'],
    ['cookie_script', 'https://cdn.cookie-script.com/s/x.js'],
    ['cookieyes', 'https://cdn-cookieyes.com/client_data/x/script.js'],
    ['didomi', 'https://sdk.privacy-center.org:443/abc/loader.js'],
  ])('reconnaît toujours %s sur %s', (id, url) => {
    expect(detectCmp([url], none).map((m) => m.id)).toContain(id);
  });
});
