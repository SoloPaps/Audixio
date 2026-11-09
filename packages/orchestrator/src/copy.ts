/**
 * Textes des e-mails (fr). Même contrat que `t()` de l’app :
 * une clé inconnue est refusée à la compilation.
 * Le linter de texte lit ce fichier.
 */

import { mailCopyEn } from './copy-en.js';

export const mailCopy = {
  'mail.alert.down.subject': 'Votre site ne répond plus',
  'mail.alert.down.body': '{site} n’a pas répondu deux fois de suite.',
  'mail.alert.down.action': 'Vérifiez que le site est en ligne.',
  'mail.alert.up.subject': 'Votre site répond de nouveau',
  'mail.alert.up.body': '{site} répond à nouveau.',
  'mail.alert.up.done': 'L’incident est terminé.',
  'mail.alert.score.subject': 'La note de votre site a baissé',
  'mail.alert.score.body': 'La note de {site} passe de {avant} à {apres}.',
  'mail.alert.score.drop': 'La baisse atteint le seuil de votre compte.',
  'mail.alert.grave.subject': 'Un problème grave est apparu',
  'mail.alert.grave.one': '{site} a un nouveau problème grave.',
  'mail.alert.grave.many': '{site} a {count} nouveaux problèmes graves.',
  'mail.alert.cert.soon.subject': 'Le certificat expire bientôt',
  'mail.alert.cert.today': 'Le certificat de {site} expire aujourd’hui.',
  'mail.alert.cert.one': 'Le certificat de {site} expire dans un jour.',
  'mail.alert.cert.many': 'Le certificat de {site} expire dans {jours} jours.',
  'mail.alert.cert.action': 'Renouvelez-le avant la coupure.',
  'mail.alert.cert.expired.subject': 'Le certificat est périmé',
  'mail.alert.cert.expired.body': 'Le certificat de {site} est périmé.',
  'mail.alert.cert.expired.action': 'Renouvelez-le pour rétablir le cadenas.',
  'mail.digest.subject': 'Votre récap du lundi',
  'mail.digest.intro':
    'Voici ce qui a changé sur vos sites suivis depuis lundi dernier.',
  'mail.digest.steady.subject': 'Rien n’a changé cette semaine',
  'mail.digest.steady.intro':
    'Aucune évolution sur vos sites suivis. Pour rappel, vos résultats actuels :',
  'mail.digest.same': 'inchangé',
  'mail.digest.report': 'Voir le rapport',
  'mail.digest.question': 'Une question ? Écrivez-nous :',
  'mail.digest.contact': 'Audixio@outlook.fr',
  'mail.digest.prefs': 'Gérer mes préférences',
  'mail.digest.legal': 'Mentions légales',
  'mail.digest.leave': 'Se désabonner',
  'mail.digest.copy': '© 2026 Audixio',
  'mail.digest.why.change':
    'Vous recevez cet e-mail car le récap du lundi est activé sur votre compte.',
  'mail.digest.why.signup':
    'Vous recevez cet e-mail car un compte Audixio vient d’être créé avec cette adresse.',
  'mail.signup.subject': 'Confirmez votre adresse — Audixio',
  'mail.signup.title': 'Bienvenue sur Audixio',
  'mail.signup.lead':
    'Merci pour votre inscription. Il reste une étape : confirmez votre adresse e-mail pour suivre vos sites et recevoir vos alertes.',
  'mail.signup.action': 'Confirmer mon adresse',
  'mail.signup.expire':
    'Ce lien expire dans 15 minutes. Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement cet e-mail.',
  'mail.signup.fallback':
    'Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :',
  'mail.signup.code': 'Code : {code}',
  'mail.brand': 'Audixio',
  'mail.digest.line': '{site} : note {score}, disponibilité {uptime}.',
  'mail.digest.incident': 'Un incident est en cours.',
  'mail.digest.delta.up': '+{points}',
  'mail.digest.delta.down': '−{points}',
  'mail.digest.delta.same': 'inchangé',
  'mail.digest.new.one': '1 constat nouveau.',
  'mail.digest.new.many': '{count} constats nouveaux.',
  'mail.digest.fixed.one': '1 constat corrigé.',
  'mail.digest.fixed.many': '{count} constats corrigés.',
  'mail.digest.open.none': 'Aucun problème grave ouvert.',
  'mail.digest.open.one': '1 problème grave ouvert.',
  'mail.digest.open.many': '{count} problèmes graves ouverts.',
  'mail.digest.ssl': 'Certificat : {jours} jours.',
  'mail.digest.score.none': 'pas encore de note',
  'mail.digest.uptime.none': 'pas encore mesurée',
  'mail.digest.uptime.pct': '{pct} %',
  'mail.digest.footer': 'Vous recevez ce résumé chaque lundi.',
  'mail.digest.unsub':
    'Pour ne plus le recevoir, utilisez le lien de désabonnement.',
  'mail.link.open': 'Ouvrir Audixio',
  'mail.link.unsubscribe': 'Me désabonner',
  'mail.unsub.title': 'Désabonnement',
  'mail.unsub.prompt': 'Confirmez pour ne plus recevoir les messages.',
  'mail.unsub.button': 'Me désabonner',
  'mail.unsub.done':
    'C’est fait. Vous ne recevrez plus les alertes ni le résumé.',
  'mail.unsub.invalid': 'Ce lien n’est pas valable.',
} as const;

const fr = mailCopy;

export type MailKey = keyof typeof fr;

type ParamNames<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParamNames<Rest>
    : never;

type ParamsOf<K extends MailKey> = {
  readonly [P in ParamNames<(typeof fr)[K]> & string]: string | number;
};

type ArgsFor<K extends MailKey> = K extends unknown
  ? ParamNames<(typeof fr)[K]> extends never
    ? []
    : [params: ParamsOf<K>]
  : never;

let mailLocale: 'fr' | 'en' = 'fr';

export function mailLocaleOf(value: unknown): 'fr' | 'en' {
  return value === 'en' ? 'en' : 'fr';
}

export function currentMailLocale(): 'fr' | 'en' {
  return mailLocale;
}

/** Isole la langue le temps d’un rendu, puis rétablit la précédente. */
export function withMailLocale<T>(locale: 'fr' | 'en', fn: () => T): T {
  const previous = mailLocale;
  mailLocale = locale;
  try {
    return fn();
  } finally {
    mailLocale = previous;
  }
}

/** Traduit une clé du dictionnaire e-mail. */
export function t<K extends MailKey>(key: K, ...args: ArgsFor<K>): string {
  const template: string = mailLocale === 'en' ? mailCopyEn[key] : fr[key];
  const params = args[0] as
    | Readonly<Record<string, string | number>>
    | undefined;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_raw, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`paramètre manquant : ${name}`);
    }
    return String(value);
  });
}
