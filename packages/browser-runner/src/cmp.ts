import type { PageElement, PageParent, PageWindow } from './page-dom.js';
import type { CmpMatch } from './schema.js';

/** Signature d'une plateforme de consentement : script chargé, variable globale, élément du DOM. */
export interface CmpSignature {
  id: string;
  name: string;
  /** Hôtes servant le script (sous-domaines compris), comparés au nom d’hôte analysé. */
  hosts: string[];
  /** Motifs de nom de fichier, pour les scripts auto-hébergés. */
  scripts: RegExp[];
  globals: string[];
  selectors: string[];
}

/** Nom d’hôte d’une URL de script (absolue ou sans schéma), sinon null. */
function hostOf(url: string): string | null {
  try {
    return new URL(url, 'https://invalid.invalid/').hostname.toLowerCase();
  } catch {
    return null;
  }
}

function servedBy(hostname: string, name: string): boolean {
  return hostname === name || hostname.endsWith(`.${name}`);
}

export const CMP_SIGNATURES: readonly CmpSignature[] = [
  {
    id: 'tarteaucitron',
    name: 'tarteaucitron',
    hosts: [],
    scripts: [/tarteaucitron[^/]*\.js/i],
    globals: ['tarteaucitron'],
    selectors: ['#tarteaucitronRoot', '#tarteaucitronAlertBig'],
  },
  {
    id: 'axeptio',
    name: 'Axeptio',
    hosts: ['axept.io'],
    scripts: [],
    globals: ['axeptioSettings', '__axeptioSDK', '_axcb'],
    selectors: ['#axeptio_overlay', '#axeptio_main_button', '.axeptio_widget'],
  },
  {
    id: 'didomi',
    name: 'Didomi',
    hosts: ['sdk.privacy-center.org'],
    scripts: [/didomi[^/]*\.js/i],
    globals: ['Didomi', 'didomiConfig', 'didomiOnReady'],
    selectors: ['#didomi-host', '#didomi-notice', '.didomi-popup-container'],
  },
  {
    id: 'cookiebot',
    name: 'Cookiebot',
    hosts: [
      'consent.cookiebot.com',
      'consent.cookiebot.eu',
      'consentcdn.cookiebot.com',
      'consentcdn.cookiebot.eu',
    ],
    scripts: [],
    globals: ['Cookiebot', 'CookieConsent'],
    selectors: ['#CybotCookiebotDialog', '#CookiebotWidget'],
  },
  {
    id: 'onetrust',
    name: 'OneTrust',
    hosts: [
      'cdn.cookielaw.org',
      'optanon.blob.core.windows.net',
      'onetrust.com',
    ],
    scripts: [/otSDKStub\.js/i],
    globals: ['OneTrust', 'Optanon', 'OptanonWrapper'],
    selectors: ['#onetrust-banner-sdk', '#onetrust-consent-sdk'],
  },
  {
    id: 'sirdata',
    name: 'Sirdata',
    hosts: ['cache.consentframework.com', 'choices.consentframework.com'],
    scripts: [],
    globals: ['Sddan'],
    selectors: ['#sd-cmp'],
  },
  {
    id: 'usercentrics',
    name: 'Usercentrics',
    hosts: ['usercentrics.eu'],
    scripts: [],
    globals: ['UC_UI', 'usercentrics'],
    selectors: ['#usercentrics-root', '#usercentrics-cmp-ui'],
  },
  {
    id: 'quantcast',
    name: 'Quantcast Choice',
    hosts: ['quantcast.mgr.consensu.org', 'cmp.inmobi.com'],
    scripts: [],
    globals: ['__qc'],
    selectors: ['.qc-cmp2-container', '#qc-cmp2-container'],
  },
  {
    id: 'iubenda',
    name: 'iubenda',
    hosts: ['cdn.iubenda.com', 'cs.iubenda.com'],
    scripts: [],
    globals: ['_iub'],
    selectors: ['#iubenda-cs-banner'],
  },
  {
    id: 'cookieyes',
    name: 'CookieYes',
    hosts: ['cdn-cookieyes.com'],
    scripts: [/cookieyes/i],
    globals: ['cookieyes', 'getCkyConsent'],
    selectors: ['.cky-consent-container', '#cookie-law-info-bar'],
  },
  {
    id: 'complianz',
    name: 'Complianz',
    hosts: [],
    scripts: [/complianz-gdpr/i, /cmplz/i],
    globals: ['complianz', 'cmplz_set_cookie'],
    selectors: ['#cmplz-cookiebanner-container', '.cmplz-cookiebanner'],
  },
  {
    id: 'cookiefirst',
    name: 'CookieFirst',
    hosts: ['consent.cookiefirst.com'],
    scripts: [],
    globals: ['CookieFirst'],
    selectors: ['.cookiefirst-root'],
  },
  {
    id: 'klaro',
    name: 'Klaro',
    hosts: [],
    scripts: [/klaro[^/]*\.js/i],
    globals: ['klaro', 'klaroConfig'],
    selectors: ['.klaro .cookie-notice', '#klaro'],
  },
  {
    id: 'orejime',
    name: 'Orejime',
    hosts: [],
    scripts: [/orejime[^/]*\.js/i],
    globals: ['orejime', 'orejimeConfig'],
    selectors: ['.orejime-Notice', '#orejime'],
  },
  {
    id: 'termly',
    name: 'Termly',
    hosts: ['app.termly.io'],
    scripts: [],
    globals: ['Termly'],
    selectors: ['#termly-code-snippet-support'],
  },
  {
    id: 'cookie_script',
    name: 'Cookie-Script',
    hosts: ['cdn.cookie-script.com'],
    scripts: [],
    globals: ['CookieScript'],
    selectors: ['#cookiescript_injected'],
  },
];

/** Constat collecté dans la page : variables et éléments présents. */
export interface CmpProbe {
  globals: string[];
  selectors: string[];
  tcfApi: boolean;
  buttons: string[];
}

export const PROBE_GLOBALS: readonly string[] = [
  ...new Set(CMP_SIGNATURES.flatMap((s) => s.globals)),
];
export const PROBE_SELECTORS: readonly string[] = [
  ...new Set(CMP_SIGNATURES.flatMap((s) => s.selectors)),
];

/** Associe les scripts chargés et le constat de la page aux plateformes connues. */
export function detectCmp(
  scriptUrls: readonly string[],
  probe: Pick<CmpProbe, 'globals' | 'selectors'>,
): CmpMatch[] {
  const globals = new Set(probe.globals);
  const selectors = new Set(probe.selectors);
  const found: CmpMatch[] = [];
  for (const signature of CMP_SIGNATURES) {
    const evidence: string[] = [];
    for (const url of scriptUrls) {
      const hostname = hostOf(url);
      if (
        (hostname !== null &&
          signature.hosts.some((name) => servedBy(hostname, name))) ||
        signature.scripts.some((re) => re.test(url))
      )
        evidence.push(`script:${url.slice(0, 290)}`);
    }
    for (const name of signature.globals)
      if (globals.has(name)) evidence.push(`global:${name}`);
    for (const selector of signature.selectors)
      if (selectors.has(selector)) evidence.push(`dom:${selector}`);
    if (evidence.length > 0)
      found.push({
        id: signature.id,
        name: signature.name,
        evidence: [...new Set(evidence)].slice(0, 20),
      });
  }
  return found;
}

/**
 * Exécuté dans la page (sérialisé par Playwright) : aucune référence externe.
 * Lit seulement, ne clique sur rien.
 */
export function probeCmpInPage(input: {
  globals: string[];
  selectors: string[];
}): CmpProbe {
  const win = globalThis as unknown as PageWindow;
  const globals = input.globals.filter((name) => {
    try {
      return win[name] !== undefined;
    } catch {
      return false;
    }
  });
  const roots: PageElement[] = [];
  const selectors = input.selectors.filter((selector) => {
    try {
      const el = win.document.querySelector(selector);
      if (el) roots.push(el);
      return el !== null;
    } catch {
      return false;
    }
  });
  const visible = (el: PageElement): boolean => {
    const rect = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  };
  const buttons: string[] = [];
  for (const root of roots) {
    const scopes: PageParent[] = [root];
    if (root.shadowRoot) scopes.push(root.shadowRoot);
    for (const scope of scopes) {
      for (const el of Array.from(
        scope.querySelectorAll(
          'button, [role="button"], a, input[type="button"], input[type="submit"]',
        ),
      )) {
        if (!visible(el)) continue;
        const text = (
          el.textContent ||
          el.getAttribute('aria-label') ||
          el.value ||
          ''
        )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80);
        if (text && !buttons.includes(text)) buttons.push(text);
        if (buttons.length >= 20) break;
      }
    }
  }
  return {
    globals,
    selectors,
    tcfApi: typeof win.__tcfapi === 'function',
    buttons,
  };
}
