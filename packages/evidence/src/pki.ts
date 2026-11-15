import * as pkijs from 'pkijs';

/**
 * pkijs n’arme pas son moteur si `self` existe sans `crypto`
 * (workers de test). On le pose explicitement sur WebCrypto.
 */
pkijs.setEngine(
  'audixio',
  new pkijs.CryptoEngine({ name: 'audixio', crypto: globalThis.crypto }),
);
