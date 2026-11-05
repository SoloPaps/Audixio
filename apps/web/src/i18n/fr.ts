/**
 * Dictionnaire français. Une clé absente de cet objet
 * ne peut pas être passée à `t()` (erreur de typage).
 */
import { espaceFr } from './espace-fr.js';
import { espaceUiFr } from './espace-ui-fr.js';
import { mqFr } from './mq-fr.js';
import { mqGatesFr } from './mq-gates-fr.js';
import { mqLegalFr } from './mq-legal-fr.js';
import { pdfFr } from './pdf-fr.js';

const frCore = {
  'skip.content': 'Aller au contenu',
  'brand.name': 'Audixio',
  'meta.home.title': 'Audixio',
  'meta.home.description':
    'Audixio audite un site et explique quoi corriger, en français simple.',
  'meta.demo.title': 'Rapport d’exemple — Audixio',
  'meta.demo.description': 'Exemple de rapport Audixio, absent du site publié.',
  'theme.label': 'Thème',
  'theme.system': 'Système',
  'theme.light': 'Clair',
  'theme.dark': 'Sombre',
  'locale.label': 'Langue',
  'locale.fr': 'Français',
  'locale.en': 'English',
  'home.title': 'Audixio',
  'home.headline': 'Vérifiez la santé de votre site, gratuitement.',
  'home.submit': "Lancer l'audit",
  'home.lead':
    'Audixio audite un site et explique quoi corriger, en français simple.',
  'home.scope':
    'Nous regardons la vitesse, la visibilité, la protection, l’écologie, l’accès, la solidité, la vie privée et le courrier.',
  'home.url': 'Adresse du site',
  'home.url.long': 'Adresse du site web à analyser',
  'home.submit.free': "Lancer l'audit gratuit",
  'home.url.format': 'Format attendu : https://domaine.fr',
  'home.url.hint': 'Par exemple, exemple.fr',
  'home.account':
    'La connexion se fait par e-mail et mot de passe, ou avec Google et GitHub.',
  'home.next': 'Le formulaire d’audit n’est pas encore en place.',
  'home.support':
    'Un score, ce qu’il veut dire, et quoi corriger. Rien n’est publié sans vous.',
  'home.url.example': 'https://exemple.fr',
  'home.url.error': 'Indiquez une adresse complète, comme https://exemple.fr.',
  'home.guarantees.time': 'Résultats complets en ~1 minute',
  'home.guarantees.free': 'Gratuit, sans abonnement',
  'home.guarantees.passive':
    'Tests passifs : nous observons, nous ne forçons rien',
  'home.method': 'Comment le score est calculé',
  'home.example.badge': 'Exemple',
  'home.example.sentence': 'Votre site peut encore gagner en clarté.',
  'home.example.https': 'Connexion chiffrée',
  'home.offer.title': 'Ce que vous obtenez',
  'home.offer.link': 'Voir la méthode',
  'home.free.title': 'Gratuit pour les particuliers',
  'home.free.audit': 'L’audit est gratuit.',
  'home.free.account':
    'Un compte n’est pas obligatoire pour lancer une vérification.',
  'home.free.private': 'Le détail d’un site n’est pas public par défaut.',
  'home.scale.title': 'Comment lire le score',
  'home.scale.range.good': '80–100',
  'home.scale.range.improve': '50–79',
  'home.scale.range.problem': '0–49',
  'nav.main': 'Pages',
  'nav.sites': 'Sites',
  'nav.sites.long': 'Sites suivis',
  'nav.close': 'Fermer le menu',
  'nav.account': 'Compte',
  'nav.login': 'Connexion',
  'nav.method': 'Méthode',
  'nav.menu': 'Menu',
  'meta.login.title': 'Connexion — Audixio',
  'meta.login.description': 'Connectez-vous pour suivre vos sites.',
  'meta.signup.title': 'Inscription — Audixio',
  'meta.signup.description': 'Créez un compte pour suivre vos sites.',
  'meta.reset.title': 'Mot de passe oublié — Audixio',
  'meta.reset.description':
    'Recevez un lien pour choisir un nouveau mot de passe.',
  'meta.confirmed.title': 'Adresse confirmée — Audixio',
  'meta.confirmed.description': 'Votre adresse e-mail est confirmée.',
  'meta.welcome.title': 'Bienvenue — Audixio',
  'meta.welcome.description': 'Trois étapes pour suivre un site.',
  'meta.sites.title': 'Vos sites — Audixio',
  'meta.sites.description': 'Les sites que vous suivez avec Audixio.',
  'meta.score.title': 'Score public — Audixio',
  'meta.score.description': 'Notes publiées par le propriétaire du site.',
  'meta.share.title': 'Score partagé — Audixio',
  'meta.share.description': 'Notes partagées par un lien privé.',
  'meta.gsc.title': 'Search Console — Audixio',
  'meta.gsc.description':
    'Reliez Search Console pour voir l’indexation de votre site.',
  'meta.launch.title': 'Lancement de l’audit — Audixio',
  'meta.launch.description': 'Audixio prépare l’audit de l’adresse indiquée.',
  'meta.progress.title': 'Audit en cours — Audixio',
  'meta.progress.description': 'Suivez l’avancement de l’audit.',
  'meta.report.title': 'Rapport — Audixio',
  'meta.report.description': 'Le résultat de l’audit et les corrections.',
  'meta.print.title': 'Rapport PDF — Audixio',
  'meta.print.description':
    'Version imprimable du rapport d’audit : couverture avec la note, priorités et résumé par domaine.',
  'meta.domain.title': 'Domaine du rapport — Audixio',
  'meta.domain.description': 'Le détail d’un domaine de l’audit.',
  'meta.verifier.title': 'Vérifier un rapport — Audixio',
  'meta.verifier.description':
    'Comparez un PDF ou un JSON au dossier, sans envoi.',
  'meta.callback.title': 'Retour de connexion — Audixio',
  'meta.callback.description': 'Ouverture de votre session Audixio.',
  'login.title': 'Connexion',
  'login.lead': 'Accédez à vos sites suivis et à vos rapports.',
  'login.card.title': 'Connexion',
  'login.tabs': 'Choisir',
  'login.tab.signin': 'Se connecter',
  'login.tab.signup': 'Créer un compte',
  'login.email': 'Adresse e-mail',
  'login.password': 'Mot de passe',
  'login.submit': 'Se connecter',
  'login.sending': 'Connexion en cours.',
  'login.sent':
    'Si le compte peut être créé, un message part. Le lien dure 15 minutes.',
  'login.failed': 'Adresse ou mot de passe incorrect.',
  'login.invalid_email': 'Cette adresse e-mail ne convient pas.',
  'login.invalid_credentials': 'Adresse ou mot de passe incorrect.',
  'login.invalid_password':
    'Le mot de passe doit contenir au moins 10 caractères.',
  'login.rate': 'Trop de tentatives. Réessayez dans un moment.',
  'login.forgot': 'Mot de passe oublié ?',
  'login.remember': 'Rester connecté',
  'login.or': 'ou avec votre e-mail',
  'login.oauth.google': 'Continuer avec Google',
  'login.oauth.github': 'Continuer avec GitHub',
  'login.oauth_error': 'Cette méthode n’est pas disponible. Utilisez l’e-mail.',
  'login.link_error': 'Ce lien n’est plus valable. Demandez-en un nouveau.',
  'login.resend': 'Renvoyer le lien',
  'login.resend.lead':
    'Le lien a expiré. Indiquez votre adresse pour en recevoir un nouveau.',
  'login.close': 'Fermer et revenir à l’accueil',
  'login.show_password': 'Afficher la saisie',
  'login.hide_password': 'Masquer la saisie',
  'login.signup.title': 'Créer un compte',
  'login.signup.lead':
    'Un message confirme l’adresse. Le lien dure 15 minutes.',
  'login.signup.submit': 'Créer mon compte',
  'login.signup.sending': 'Création du compte.',
  'login.signup.sent':
    'Si le compte peut être créé, un message part. Le lien dure 15 minutes.',
  'login.signup.password_hint': '10 caractères minimum.',
  'login.email.placeholder': 'nom@exemple.fr',
  'login.password.placeholder': 'Votre mot de passe',
  'login.signup.password.placeholder': '10 caractères minimum',
  'login.signup.pitch': 'Créez votre compte gratuit en quelques secondes.',
  'login.brand.google': 'Google',
  'login.brand.github': 'GitHub',
  'login.verify.title': 'Confirmez votre adresse',
  'login.verify.lead':
    'Nous avons envoyé un e-mail de confirmation à {email}. Le lien dure 15 minutes.',
  'login.verify.you': 'votre adresse',
  'login.verify.cta': 'J’ai confirmé, me connecter',
  'login.verify.miss': 'Rien reçu ? Vérifiez vos indésirables ou',
  'login.verify.resend': 'renvoyer l’e-mail',
  'login.legal':
    'Connexion par e-mail et mot de passe, Google ou GitHub. Aucun traceur.',
  'login.meter.empty': 'Saisissez un mot de passe',
  'login.meter.short': 'Trop court : 10 caractères minimum.',
  'login.meter.weak': 'Faible',
  'login.meter.fair': 'Moyen',
  'login.meter.good': 'Bon',
  'login.meter.strong': 'Très solide',
  'login.signup.accept': 'J’accepte les',
  'login.signup.and': 'et j’ai lu la',
  'login.signup.privacy': 'politique de confidentialité',
  'auth.crumbs': 'Fil d’Ariane',
  'login.signup.terms': 'J’accepte les conditions d’utilisation.',
  'login.signup.terms_required': 'Cochez la case pour accepter les conditions.',
  'login.signup.mismatch': 'Les deux mots de passe ne correspondent pas.',
  'login.ready': 'Vous êtes connecté.',
  'login.sites': 'Voir vos sites',
  'login.account': 'Gérer le compte',
  'login.signout': 'Se déconnecter',
  'login.unconfigured':
    'La connexion n’est pas disponible sur cette installation.',
  'callback.working': 'Ouverture de votre session.',
  'callback.failed': 'Le lien n’a pas ouvert la session.',
  'callback.retry': 'Retour à la connexion',
  'reset.title': 'Mot de passe oublié ?',
  'reset.before': 'Mot de passe',
  'reset.em': 'oublié ?',
  'reset.lead':
    'Indiquez l’adresse e-mail de votre compte. Nous envoyons un lien sécurisé, valable 15 minutes.',
  'reset.submit': 'Recevoir le lien',
  'reset.crumb': 'Mot de passe oublié',
  'reset.sent.for':
    'Si un compte existe pour {email}, un e-mail vient de partir.',
  'reset.help.title': 'Besoin d’aide ?',
  'reset.help.login.hint': 'Vous vous souvenez de votre mot de passe.',
  'reset.help.mail': 'Contacter l’équipe',
  'reset.help.mail.hint': 'Pas reçu l’e-mail après 10 minutes.',
  'reset.help.safe': 'Sécurité et confidentialité',
  'reset.help.safe.hint': 'Comment nous protégeons vos accès.',
  'reset.new.before': 'Choisissez un',
  'reset.new.em': 'nouveau mot de passe',
  'reset.new.note': 'Les autres sessions seront fermées.',
  'reset.sending': 'Envoi en cours.',
  'reset.sent':
    'Si un compte existe, le lien est dans votre boîte. Il dure 15 minutes.',
  'reset.back': 'Retour à la connexion',
  'reset.new.title': 'Choisissez un nouveau mot de passe',
  'reset.new.lead': 'Saisissez-le deux fois. 10 caractères minimum.',
  'reset.new.password': 'Nouveau mot de passe',
  'reset.new.confirm': 'Confirmer le mot de passe',
  'reset.new.submit': 'Enregistrer le mot de passe',
  'confirmed.title': 'Adresse e-mail confirmée',
  'confirmed.before': 'Adresse e-mail',
  'confirmed.em': 'confirmée',
  'confirmed.chip': 'Compte activé',
  'confirmed.crumb': 'E-mail confirmé',
  'confirmed.next': 'Et ensuite ?',
  'confirmed.next.lead': 'Trois façons de bien démarrer.',
  'confirmed.sites': 'Mes sites suivis',
  'confirmed.sites.hint': 'Retrouvez vos domaines et leur évolution.',
  'confirmed.account': 'Mon compte',
  'confirmed.account.hint': 'Profil, accès partagés et préférences.',
  'confirmed.method': 'La méthode',
  'confirmed.method.hint': 'Comment nous notons les 8 domaines.',
  'confirmed.lead':
    'Votre compte est ouvert. Vous pouvez lancer un premier audit.',
  'confirmed.audit': 'Lancer mon premier audit',
  'confirmed.discover': 'Découvrir Audixio',
  'welcome.eyebrow': 'Première connexion',
  'welcome.title': 'Bienvenue sur Audixio',
  'welcome.named': 'Bienvenue sur Audixio, {name}',
  'welcome.lead':
    'Trois étapes pour suivre un site. Comptez une dizaine de minutes.',
  'welcome.audit': 'Lancer mon premier audit',
  'welcome.later': 'Plus tard',
  'welcome.later.hint':
    'Plus tard ferme cet accueil. Il ne s’affichera plus. La checklist reste dans le compte.',
  'welcome.steps': 'Les 3 étapes',
  'welcome.check.title': 'Checklist de démarrage',
  'welcome.check.1.title': 'Lancer un premier audit',
  'welcome.check.1.text':
    'Saisissez l’adresse du site. L’analyse est passive et donne une note de A à F.',
  'welcome.check.1.action': 'Lancer un audit',
  'welcome.check.2.title': 'Vérifier la propriété du site',
  'welcome.check.2.text':
    'Prouvez que le site vous appartient pour ouvrir le rapport complet.',
  'welcome.check.2.action': 'Vérifier la propriété',
  'welcome.check.3.title': 'Suivre le site dans le temps',
  'welcome.check.3.text':
    'Ajoutez le site à vos sites suivis pour les ré-audits et le résumé du lundi.',
  'welcome.check.3.action': 'Voir mes sites suivis',
  'welcome.note': 'Vous retrouverez cette checklist dans votre compte.',
  'welcome.more': 'Comprendre avant de commencer',
  'welcome.method': 'Méthode et barème',
  'welcome.method.hint': 'Comment la note de A à F est calculée.',
  'welcome.example': 'Exemple de rapport',
  'welcome.example.hint': 'Voir un rapport complet avant le vôtre.',
  'launch.title': 'Lancement de l’audit',
  'launch.working': 'Nous préparons l’audit.',
  'launch.missing': 'Indiquez l’adresse du site sur l’accueil.',
  'launch.back': 'Retour à l’accueil',
  'sites.title': 'Vos sites',
  'sites.lead': 'Ajoutez un site, puis lancez un audit quand vous voulez.',
  'sites.empty': 'Aucun site pour le moment.',
  'sites.actions': 'Actions du site',
  'sites.url': 'Adresse du site',
  'sites.add': 'Ajouter un site',
  'sites.adding': 'Ajout du site.',
  'sites.audit': 'Lancer un audit',
  'sites.added': 'Le site a été ajouté.',
  'sites.duplicate': 'Ce site est déjà dans votre liste.',
  'sites.loading': 'Chargement de vos sites.',
  'sites.need_login': 'Connectez-vous pour voir vos sites.',
  'sites.error': 'La liste des sites ne s’affiche pas. Réessayez.',
  'sites.signout': 'Se déconnecter',
  'sites.publish': 'Publier la page de score',
  'sites.publish.hint':
    'Les notes deviennent visibles. Les failles restent masquées.',
  'sites.security': 'Publier le détail de la protection',
  'sites.security.hint': 'Par défaut, ce détail reste masqué.',
  'sites.share.create': 'Créer un lien de partage',
  'sites.share.creating': 'Création du lien.',
  'sites.share.revoke': 'Retirer le lien',
  'sites.share.revoking': 'Retrait du lien.',
  'sites.share.revoked': 'Le lien ne fonctionne plus.',
  'sites.share.need_audit': 'Lancez un audit avant de partager.',
  'sites.share.label': 'Lien de partage',
  'sites.badge': 'Télécharger le badge',
  'sites.badge.hint': 'Le fichier ne contient aucun traceur.',
  'sites.slug.taken': 'Ce lien public est déjà pris. Réessayez.',
  'score.public.loading': 'Chargement du score.',
  'score.public.missing': 'Cette page n’est pas publiée.',
  'score.public.error': 'Le score ne s’affiche pas. Réessayez.',
  'score.public.empty': 'Aucun audit terminé pour l’instant.',
  'score.public.lead':
    'Les notes sont publiques. Le détail des failles ne l’est pas.',
  'score.security.hidden': 'Le détail de la protection n’est pas publié.',
  'score.security.title': 'Détail de la protection',
  'score.security.generic': 'Un point de protection est signalé.',
  'score.public.optout.title': 'Propriétaire de ce site',
  'score.public.optout.lead':
    'Vous êtes propriétaire de ce nom de domaine ? Connectez-vous pour administrer, masquer ou retirer cette page.',
  'score.public.optout.action': 'Gérer ce site',
  'share.missing': 'Ce lien ne fonctionne plus.',
  'share.banner': 'Lien équipe · Lecture seule',
  'score.public.heading': 'Score public',
  'score.public.missing.title': 'Ce score n’est pas publié',
  'share.heading': 'Score partagé',
  'share.missing.title': 'Ce lien de partage ne fonctionne plus',
  'share.none.title': 'Aucun lien de partage',
  'share.none': 'Ouvrez le lien complet reçu de votre équipe.',
  'gsc.connect': 'Connecter Search Console',
  'gsc.page.title': 'Search Console',
  'gsc.page.lead':
    'Reliez Google pour voir si vos pages sont indexées. Lecture seule.',
  'gsc.page.connected': 'Search Console est relié à votre compte.',
  'gsc.page.revoke': 'Retirer l’accès',
  'gsc.page.revoking': 'Retrait de l’accès.',
  'gsc.page.revoked': 'L’accès Search Console est retiré.',
  'gsc.page.saved': 'Search Console est relié.',
  'gsc.page.error': 'La connexion n’a pas abouti. Vous pouvez réessayer.',
  'gsc.page.missing': 'La connexion Search Console n’est pas configurée ici.',
  'gsc.page.loading': 'Chargement de la connexion.',
  'gsc.page.need_login': 'Connectez-vous pour relier Search Console.',
  'sites.verify': 'Prouver que le site est à vous',
  'meta.verify.title': 'Vérifier un site — Audixio',
  'meta.verify.description':
    'Prouvez que le site est à vous avant les tests approfondis.',
  'verify.title': 'Prouver que le site est à vous',
  'verify.intro': 'Les tests approfondis partent seulement après cette preuve.',
  'verify.consent': 'Sans votre accord, ces tests peuvent être interdits.',
  'verify.legal_law':
    'L’article 323-1 du code pénal vise l’accès non autorisé.',
  'verify.need_login': 'Connectez-vous pour vérifier un site.',
  'verify.missing': 'Choisissez un site dans votre liste.',
  'verify.loading': 'Chargement de la vérification.',
  'verify.error': 'La vérification n’a pas abouti. Réessayez.',
  'verify.not_found': 'Ce site ne figure pas dans votre liste.',
  'verify.method': 'Méthode de preuve',
  'verify.method.dns': 'Enregistrement du nom de domaine',
  'verify.method.file': 'Fichier sur le site',
  'verify.method.meta': 'Balise dans la page',
  'verify.method.html': 'Fichier HTML à la racine',
  'verify.method.well_known': 'Fichier .well-known',
  'verify.method.gsc': 'Search Console',
  'verify.gsc.later':
    'Search Console arrive plus tard. Choisissez une autre méthode.',
  'verify.now': 'Vérifier maintenant',
  'verify.retry': 'Réessayer',
  'verify.report': 'Voir le rapport complet',
  'verify.state.idle.title': 'En attente de vérification',
  'verify.state.idle.body':
    'La détection démarre quand vous lancez la vérification.',
  'verify.state.checking.title': 'Recherche du code',
  'verify.state.checking.body': 'La sonde lit seulement l’adresse indiquée.',
  'verify.state.ok.title': 'Contrôle du domaine confirmé',
  'verify.state.ok.body':
    'Le code a été détecté. Le rapport complet est ouvert.',
  'verify.state.fail.title': 'Code introuvable',
  'verify.state.fail.body':
    'Vérifiez la publication, puis réessayez. Aucune pénalité.',
  'verify.recheck': 'Audixio relit le code avant chaque test actif.',
  'verify.html_url': 'Adresse du fichier HTML',
  'verify.well_known_url': 'Adresse du fichier .well-known',
  'verify.create': 'Créer le code',
  'verify.creating': 'Création du code.',
  'verify.check': 'Vérifier le site',
  'verify.checking': 'Vérification en cours.',
  'verify.copy': 'Copier le code',
  'verify.copied': 'Le code est copié.',
  'verify.copy_failed': 'Sélectionnez le code et copiez-le à la main.',
  'verify.status.pending':
    'Le code n’est pas encore visible. Placez-le, puis réessayez.',
  'verify.verified': 'Le site est vérifié. Les tests approfondis sont ouverts.',
  'verify.failed': 'La preuve n’a pas été trouvée.',
  'verify.expired': 'La preuve a disparu. Les tests approfondis sont arrêtés.',
  'verify.token': 'Code à publier',
  'verify.back': 'Retour aux sites',
  'verify.record_name': 'Nom',
  'verify.record_value': 'Valeur',
  'verify.file_url': 'Adresse du fichier',
  'verify.meta_tag': 'Balise à ajouter',
  'verify.guide.netlify.title': 'Chez Netlify, dans le DNS',
  'verify.guide.registrar.title': 'Chez le service qui gère le nom',
  'verify.guide.github.title': 'Sur GitHub Pages',
  'verify.guide.file.title': 'Fichier à la racine publiée',
  'verify.guide.meta.title': 'Balise dans la page',
  'verify.github.dns':
    'Un nom github.io ne se règle pas ici. Utilisez le fichier, ou un domaine à vous.',
  'verify.guide.netlify.1':
    'Ouvrez le site dans Netlify, puis la page du domaine.',
  'verify.guide.netlify.2':
    'Ouvrez le DNS Netlify et ajoutez un enregistrement.',
  'verify.guide.netlify.3':
    'Le type est TXT. Copiez le nom et la valeur ci-dessous.',
  'verify.guide.netlify.4': 'Enregistrez. Attendez quelques minutes.',
  'verify.guide.netlify.5': 'Revenez ici et lancez la vérification.',
  'verify.guide.registrar.1': 'Connectez-vous chez le service qui gère le nom.',
  'verify.guide.registrar.2': 'Ouvrez la zone DNS de ce domaine.',
  'verify.guide.registrar.3': 'Ajoutez un enregistrement de type TXT.',
  'verify.guide.registrar.4': 'Copiez le nom et la valeur indiqués ici.',
  'verify.guide.registrar.5': 'Attendez quelques minutes, puis vérifiez.',
  'verify.guide.github.1': 'Ouvrez le dépôt, sur la branche qui est publiée.',
  'verify.guide.github.2': 'Créez le fichier à la racine du site publié.',
  'verify.guide.github.3':
    'Le fichier contient seulement le code, sans balise autour.',
  'verify.guide.github.4':
    'Ne le mettez pas dans un dossier qui commence par un point.',
  'verify.guide.github.5':
    'Ces dossiers sont ignorés, sauf avec le fichier .nojekyll.',
  'verify.guide.github.6': 'Publiez le site, puis lancez la vérification ici.',
  'verify.guide.file.1': 'Créez le fichier à l’adresse indiquée.',
  'verify.guide.file.2': 'Collez seulement le code, sans autre texte.',
  'verify.guide.file.3': 'Publiez cette version du site.',
  'verify.guide.file.4': 'Revenez ici et lancez la vérification.',
  'verify.guide.meta.1': 'Ouvrez le modèle HTML de la page du site.',
  'verify.guide.meta.2': 'Dans l’en-tête, ajoutez la balise indiquée.',
  'verify.guide.meta.3':
    'Le code doit être dans le HTML reçu, pas ajouté par un script.',
  'verify.guide.meta.4': 'Publiez, puis lancez la vérification.',
  'verify.guide.html.title': 'Fichier HTML à la racine',
  'verify.guide.html.1': 'Créez la page HTML à l’adresse indiquée.',
  'verify.guide.html.2':
    'La page contient la valeur indiquée, seule sur une ligne.',
  'verify.guide.html.3': 'Publiez cette version du site.',
  'verify.guide.html.4': 'Revenez ici et lancez la vérification.',
  'verify.guide.well_known.title': 'Fichier public .well-known',
  'verify.guide.well_known.1':
    'Créez le fichier à l’adresse indiquée, à la racine du nom.',
  'verify.guide.well_known.2':
    'Le fichier contient seulement la valeur indiquée.',
  'verify.guide.well_known.3': 'Publiez, puis lancez la vérification.',
  'progress.title': 'Avancement de l’audit',
  'progress.loading': 'Chargement de l’avancement.',
  'progress.queued': 'L’audit est en file. Il démarre bientôt.',
  'progress.running': 'L’audit lit les pages publiques.',
  'progress.partial': 'Une partie des mesures est prête. Le reste continue.',
  'progress.done': 'L’audit est terminé.',
  'progress.failed': 'L’audit n’a pas abouti. Vous pouvez le relancer.',
  'failure.audit.of': 'L’audit de ',
  'failure.audit.generic': 'L’audit ',
  'failure.unmeasured': 'Aucune mesure',
  'progress.live': 'Analyse en cours.',
  'progress.ready': 'Rapport prêt.',
  'progress.ready.heading': 'Votre diagnostic est prêt pour',
  'progress.ready.lead':
    'L’analyse est terminée. Votre rapport complet, avec les priorités et le plan d’action, vous attend.',
  'progress.done.live': 'Analyse terminée',
  'progress.done.phrase': 'Diagnostic terminé : votre rapport est disponible',
  'progress.sim.images':
    'Analyse de la compression des images et du poids global',
  'progress.sim.mobile':
    'Vérification de la fluidité et du confort de lecture sur smartphone',
  'progress.sim.a11y': 'Contrôle des contrastes et de la navigation au clavier',
  'progress.sim.code': 'Lecture du code source et recherche des erreurs',
  'progress.sim.summary':
    'Génération de la synthèse finale et des recommandations',
  'progress.eta.one': '~{seconds} seconde',
  'progress.eta.many': '~{seconds} secondes',
  'progress.home': 'Revenir à l’accueil',
  'progress.report': 'Voir le rapport',
  'progress.notify.title': 'Recevoir les résultats dès finalisation',
  'progress.notify.body':
    'Le diagnostic se termine dans quelques instants. Vous recevrez une synthèse directe et le lien d’accès.',
  'progress.notify.email': 'Votre adresse e-mail',
  'progress.notify.invalid': 'Merci de saisir une adresse e-mail valide.',
  'progress.notify.submit': 'Enregistrer ma notification',
  'progress.notify.ok': 'Notification activée. Vous pouvez fermer cette page.',
  'progress.notify.close': 'Fermer',
  'progress.notify.done': 'Notification activée',
  'progress.retry': 'Relancer l’audit',
  'progress.missing': 'Cet audit est introuvable.',
  'progress.need_login': 'Connectez-vous pour suivre cet audit.',
  'report.heading': 'Rapport',
  'domain.heading': 'Détail du domaine',
  'report.loading': 'Chargement du rapport.',
  'report.pending': 'L’audit n’est pas encore terminé.',
  'report.progress': 'Voir la progression',
  'report.missing': 'Ce rapport est introuvable.',
  'report.unavailable': 'Rapport introuvable ou réservé à son propriétaire.',
  'report.need_login': 'Connectez-vous pour lire ce rapport.',
  'report.back': 'Retour au rapport',
  'print.heading': 'Rapport à imprimer',
  'print.link': 'Imprimer',
  'print.id': 'Identifiant du rapport',
  'print.results': 'Empreinte du fichier de résultats',
  'print.date': 'Date d’observation',
  'print.verify': 'Adresse de vérification',
  'print.qr': 'Code de la page de vérification',
  'print.captures': 'Captures de la page d’accueil',
  'print.capture.desktop': 'Ordinateur, {date}',
  'print.capture.mobile': 'Téléphone, {date}',
  'print.pending': 'L’empreinte n’est pas encore calculée.',
  'print.legal':
    'Ce rapport n’est pas un constat de commissaire de justice et n’en a pas la valeur.',
  'print.observed':
    'Il décrit ce que nos robots ont observé, à la date indiquée.',
  'print.eidas': 'Horodatage RFC 3161 non qualifié au sens d’eIDAS.',
  'print.login': 'Connectez-vous pour imprimer ce rapport.',
  'print.pdf': 'Le navigateur peut l’enregistrer en PDF.',
  'export.markdown': 'Télécharger en Markdown',
  'export.notProof': 'Ce fichier n’est pas une preuve.',
  'export.score': 'Score global : {score}',
  'export.score.untested': 'Score global : Non testé',
  'export.domain': '{label} : {score}',
  'export.limit': 'Limite : {text}',
  'report.coverage': 'Domaines notés : {scored} sur {total}.',
  'report.filter.label': 'Filtrer les corrections',
  'report.filter.all': 'Tout',
  'report.filter.fail': 'Problèmes',
  'report.filter.warn': 'À améliorer',
  'report.filter.pass': 'Réussites',
  'report.filter.empty': 'Aucune correction dans ce filtre.',
  'report.domain.missing': 'Ce domaine ne figure pas dans le rapport.',
  'footer.id': 'Identifiant {id}',
  'verify.pending': 'L’empreinte du fichier n’est pas encore calculée.',
  'verify.id': 'L’identifiant permet de retrouver cet audit.',
  'verify.legal': 'Ce rapport n’est pas un constat de commissaire de justice.',
  'verify.legal.value': 'Il n’en a pas la valeur.',
  'verify.observed':
    'Il décrit ce que nos robots ont observé, à la date indiquée.',
  'verify.eidas': 'Horodatage RFC 3161 non qualifié au sens d’eIDAS.',
  'verify.eidas.recevable':
    'Un horodatage non qualifié reste recevable comme preuve.',
  'verify.eidas.article': 'C’est l’article 41.1 du règlement eIDAS.',
  'verify.eidas.presomption':
    'Il n’a pas de présomption d’exactitude (article 41.2).',
  'audit.retry.minutes': 'Vous pourrez relancer dans {minutes} min.',
  'audit.retry.seconds': 'Vous pourrez relancer dans {seconds} s.',
  noscript: 'Activez JavaScript pour utiliser cette page.',
  'domain.performance.good': 'Les pages s’affichent assez vite.',
  'domain.performance.improve': 'Les pages peuvent s’afficher plus vite.',
  'domain.performance.problem': 'Les pages s’affichent trop lentement.',
  'domain.performance.untested': 'Nous n’avons pas pu mesurer la vitesse.',
  'domain.seo.good': 'Vos pages sont faciles à trouver.',
  'domain.seo.improve': 'Vos pages peuvent mieux se faire trouver.',
  'domain.seo.problem': 'Vos pages sont difficiles à trouver.',
  'domain.seo.untested': 'Nous n’avons pas pu vérifier la visibilité.',
  'domain.securite.good': 'Les protections de base sont en place.',
  'domain.securite.improve': 'Certaines protections peuvent être renforcées.',
  'domain.securite.problem': 'Des protections importantes manquent.',
  'domain.securite.untested': 'Nous n’avons pas pu vérifier la protection.',
  'domain.locked.badge': 'Verrouillé',
  'domain.locked.teaser':
    'Aperçu fermé. Le détail s’ouvre après la preuve de propriété.',
  'domain.locked.cta': 'Prouver la propriété',
  'report.partial': 'partielle · {n} domaines · site non vérifié',
  'domain.ecologie.good': 'La page reste légère à charger.',
  'domain.ecologie.improve': 'La page peut être allégée.',
  'domain.ecologie.problem': 'La page est lourde à charger.',
  'domain.ecologie.untested': 'Nous n’avons pas pu estimer l’impact.',
  'domain.accessibilite.good': 'La page se lit au clavier et à l’écran.',
  'domain.accessibilite.improve':
    'Certains obstacles gênent encore la lecture.',
  'domain.accessibilite.problem':
    'La page est difficile à lire pour beaucoup de personnes.',
  'domain.accessibilite.untested': 'Nous n’avons pas pu vérifier l’accès.',
  'domain.qualite.good': 'La base technique ne montre pas d’erreur.',
  'domain.qualite.improve': 'Quelques points techniques méritent un passage.',
  'domain.qualite.problem': 'La base technique montre des erreurs.',
  'domain.qualite.untested': 'Nous n’avons pas pu vérifier la base technique.',
  'domain.vie_privee.good': 'Peu de données partent avant votre choix.',
  'domain.vie_privee.improve': 'Le choix sur les données peut être plus clair.',
  'domain.vie_privee.problem': 'Des données partent avant un choix clair.',
  'domain.vie_privee.untested': 'Nous n’avons pas pu vérifier la vie privée.',
  'domain.dns_email.good': 'Le nom et le courrier sont bien protégés.',
  'domain.dns_email.improve':
    'La protection du nom ou du courrier peut être renforcée.',
  'domain.dns_email.problem': 'Le nom ou le courrier est mal protégé.',
  'domain.dns_email.untested':
    'Nous n’avons pas pu vérifier le nom ni le courrier.',
  'domain.reputation.plain': 'Avis',
  'domain.reputation.tech': 'Réputation',
  'domain.reputation.good': 'Les avis publics sont favorables.',
  'domain.reputation.improve': 'Les avis publics sont mitigés.',
  'domain.reputation.problem': 'Les avis publics sont faibles.',
  'domain.reputation.untested': 'Nous n’avons pas consulté les avis.',
  'places.aside.title': 'Avis',
  'places.aside.note': 'Ce score reste en dehors du score global.',
  'places.choose': 'Choisir le lieu',
  'places.rating': 'Note publique : {rating} sur 5.',
  'places.count': '{count} avis publics.',
  'places.score': 'Score des avis : {score} sur 100.',
  'places.lead': 'Reliez le lieu pour afficher la note et le nombre d’avis.',
  'places.search.label': 'Nom du lieu',
  'places.search.hint': 'Indiquez le nom tel qu’il figure dans les avis.',
  'places.search.action': 'Chercher le lieu',
  'places.searching': 'Recherche en cours.',
  'places.empty': 'Aucun lieu ne correspond.',
  'places.confirm': 'Choisir ce lieu',
  'places.confirmed': 'Lieu retenu.',
  'places.clear': 'Changer de lieu',
  'places.clearing': 'Retrait du lieu.',
  'places.error': 'La recherche n’a pas abouti. Réessayez.',
  'places.none': 'Ce lieu n’a pas encore d’avis public.',
  'domain.disponibilite.plain': 'Disponibilité',
  'domain.disponibilite.tech': 'Présence en ligne',
  'domain.disponibilite.good': 'Le site répond quand on l’appelle.',
  'domain.disponibilite.improve': 'Le site a manqué quelques réponses.',
  'domain.disponibilite.problem': 'Le site répond mal, ou pas du tout.',
  'domain.disponibilite.untested': 'Nous n’avons pas suivi la disponibilité.',
  'domain.sentence.good': 'Ce domaine est en bon état.',
  'domain.sentence.improve': 'Ce domaine peut être amélioré.',
  'domain.sentence.problem': 'Ce domaine pose un problème important.',
  'domain.sentence.untested': 'Nous n’avons pas pu noter ce domaine.',
  'footer.note': 'Outil gratuit. Aucun traceur. Polices hébergées ici.',
  'link.external': 'hors d’Audixio',
  'footer.legal': 'Informations légales',
  'footer.mentions': 'Mentions légales',
  'footer.privacy': 'Confidentialité',
  'footer.terms': 'Conditions d’utilisation',
  'footer.a11y': 'Accessibilité',
  'footer.method.nav': 'Méthode',
  'level.good': 'Bon',
  'level.improve': 'À améliorer',
  'level.problem': 'Problème',
  'level.untested': 'Non testé',
  'level.good.sentence': 'bon',
  'level.improve.sentence': 'à améliorer',
  'level.problem.sentence': 'problème',
  'level.untested.sentence': 'non testé',
  'status.pass': 'Réussi',
  'status.warn': 'À améliorer',
  'status.fail': 'Problème',
  'status.untested': 'Non testé',
  'status.na': 'Non applicable',
  'gauge.score': '{domain} : {score} sur 100, {level}',
  'gauge.untested': '{domain} : {level}',
  'gauge.denom': '/100',
  'gauge.sample.zero': 'Note de zéro',
  'gauge.sample.full': 'Note pleine',
  'gauge.sample.empty': 'Note absente',
  'score.empty': '—',
  'verdict.good': 'Votre site est en bonne santé.',
  'verdict.improve': 'Votre site peut mieux faire.',
  'verdict.problem': 'Votre site a des problèmes importants.',
  'verdict.untested': 'Nous n’avons pas assez de mesures.',
  'verdict.fixes.none': 'Rien à corriger pour l’instant.',
  'verdict.fixes.one.urgent': '1 point à corriger, dont 1 urgent.',
  'verdict.fixes.one.calm': '1 point à corriger, sans urgence.',
  'verdict.fixes.many.one': '{count} points à corriger, dont 1 urgent.',
  'verdict.fixes.many.many':
    '{count} points à corriger, dont {urgent} urgents.',
  'verdict.fixes.many.calm': '{count} points à corriger, sans urgence.',
  'verdict.skipped.one': '1 point n’a pas pu être testé.',
  'verdict.skipped.many': '{count} points n’ont pas pu être testés.',
  'verdict.actions': 'À traiter d’abord',
  'domain.global': 'Score global',
  'domain.performance.plain': 'Vitesse',
  'domain.performance.tech': 'Performance',
  'domain.performance.detail': 'Votre site s’affiche en 1,8 s sur mobile.',
  'domain.seo.plain': 'Visibilité sur Google',
  'domain.seo.tech': 'Référencement',
  'domain.seo.detail': 'Vos pages sont faciles à trouver sur Google.',
  'domain.securite.plain': 'Protection',
  'domain.securite.tech': 'Sécurité',
  'domain.securite.detail': 'Des pages s’ouvrent encore sans adresse chiffrée.',
  'domain.ecologie.plain': 'Impact écologique',
  'domain.ecologie.tech': 'Écologie',
  'domain.ecologie.detail': 'La page reste légère à charger.',
  'domain.accessibilite.plain': 'Accès pour tous',
  'domain.accessibilite.tech': 'Accessibilité',
  'domain.accessibilite.detail': 'La page se lit au clavier et à l’écran.',
  'domain.qualite.plain': 'Solidité',
  'domain.qualite.tech': 'Qualité technique',
  'domain.qualite.detail': 'La base technique ne montre pas d’erreur.',
  'domain.vie_privee.plain': 'Vie privée',
  'domain.vie_privee.tech': 'Données personnelles',
  'domain.vie_privee.detail': 'Peu de données partent avant votre choix.',
  'domain.dns_email.plain': 'Nom et courrier',
  'domain.dns_email.tech': 'DNS et e-mail',
  'domain.dns_email.detail':
    'Nous n’avons pas pu vérifier le nom ni le courrier.',
  'demo.note': 'Exemple de rapport. Ce n’est pas un audit réel.',
  'section.categories': 'Ce qui compose la note',
  'section.findings': 'Quoi corriger',
  'section.table': 'Historique',
  'section.verify': 'Vérification',
  'section.gauges': 'Le chiffre dans le cercle',
  'section.gauges.lead':
    'Le chiffre reste lisible pour 0, 100 et l’absence de note.',
  'group.priority': 'À corriger en priorité',
  'group.next': 'À améliorer ensuite',
  'group.good': 'Ce qui va bien',
  'finding.fix': 'Voir comment corriger',
  'finding.limit': 'Limite de ce constat',
  'finding.effort': '{minutes} min',
  'finding.done': 'Rien à changer',
  'finding.unknown': 'Durée inconnue',
  'finding.untested': "Nous n'avons pas pu tester ce point.",
  'finding.copy': 'Copier',
  'finding.copied': 'Copié',
  'toc.label': 'Sommaire',
  'measure.lcp': "Votre site met {duree} à s'afficher (LCP).",
  'table.date': 'Date',
  'history.summary.up': '+{points} points depuis le {date}',
  'history.summary.up.one': '+1 point depuis le {date}',
  'history.summary.down': '−{points} points depuis le {date}',
  'history.summary.down.one': '−1 point depuis le {date}',
  'history.summary.same': 'Même score depuis le {date}',
  'history.summary.single': 'Première mesure le {date}',
  'history.curve.flat': 'La courbe est plate : le score n’a pas changé.',
  'history.curve.single':
    'Une seule mesure. La courbe viendra au prochain audit.',
  'history.summary.empty': 'Pas encore de mesure.',
  'history.table.show': 'Voir en tableau',
  'history.caption': 'Scores du {start} au {end}',
  'history.caption.one': 'Score du {date}',
  'history.series': 'Courbes affichées',
  'history.others': 'Autres mesures',
  'history.series.limit': 'Trois courbes au plus.',
  'history.point': '{series} : {score} sur 100, le {date}',
  'history.chart': 'Courbe des scores, de 0 à 100',
  'history.axis': 'Axe de 0 à 100.',
  'history.thresholds': 'Les bandes marquent 50 et 80.',
  'compare.title': 'Comparer deux audits',
  'compare.older': 'Audit de départ',
  'compare.newer': 'Audit récent',
  'compare.new': 'Nouveaux problèmes',
  'compare.fixed': 'Corrigés',
  'compare.new.empty': 'Aucun nouveau problème.',
  'compare.fixed.empty': 'Rien n’a été corrigé.',
  'compare.same': 'Choisissez deux audits différents.',
  'compare.need': 'Deux audits sont nécessaires pour comparer.',
  'footer.method': 'Méthode {version}',
  'footer.hash': 'Empreinte {hash}',
  'footer.verify': 'Vérifier ce rapport',
  'verify.how': 'Comment vérifier ce rapport',
  'verify.proof.summary': 'Ce que cette preuve vaut, et ses limites.',
  'verify.lead':
    'Le contrôle du fichier se fera dans votre navigateur, sans envoi.',
  'verifier.heading': 'Vérifier un rapport',
  'verifier.lead':
    'Le contrôle du fichier se fait dans votre navigateur, sans envoi.',
  'verifier.local': 'Le fichier reste sur votre appareil.',
  'verifier.loading': 'Chargement du dossier.',
  'verifier.missing': 'Ce dossier est introuvable.',
  'verifier.invalid': 'Ce dossier est illisible.',
  'verifier.date': 'Date du rapport',
  'verifier.fingerprint': 'Empreinte du rapport',
  'verifier.stamps': 'Horodatages',
  'verifier.empty': 'Aucun horodatage n’est joint.',
  'verifier.time': 'Heure de l’horodatage',
  'verifier.issuer': 'Émetteur',
  'verifier.proof': 'Signature',
  'verifier.signature.ok': 'La signature correspond.',
  'verifier.signature.bad': 'La signature ne correspond pas.',
  'verifier.signature.absent': 'Ce rapport n’est pas signé.',
  'verifier.signature.wait': 'Vérification de la signature.',
  'verifier.check': 'Contrôle du fichier',
  'verifier.file': 'Fichier du rapport',
  'verifier.file.choose': 'Choisir un fichier',
  'verifier.file.none': 'Aucun fichier choisi',
  'verifier.hint': 'Déposez le PDF ou le JSON du rapport.',
  'verifier.tooBig': 'Ce fichier dépasse 20 Mo.',
  'verifier.match': 'Ce fichier correspond.',
  'verifier.mismatch': 'Ce fichier ne correspond pas.',
  'verifier.link': 'Lien de vérification',
  'verifier.qr': 'Code du lien de vérification',
  'verifier.expert': 'Vérification experte',
  'verifier.openssl.lead': 'Cette commande vérifie le jeton sur votre machine.',
  'verifier.openssl':
    'openssl ts -verify -in jeton.tsr -digest {digest} -CAfile chaine.pem',
  'verifier.download.token': 'Télécharger le jeton de {service}',
  'verifier.download.chain': 'Télécharger la chaîne de {service}',
  'demo.https.title': 'Le site accepte encore une adresse non chiffrée',
  'demo.https.why':
    'Un visiteur peut envoyer des données sur une page lisible par d’autres.',
  'demo.https.s1': 'Ouvrez les en-têtes http de votre hébergeur.',
  'demo.https.s2': 'Redirigez toutes les adresses http vers https.',
  'demo.https.s3': 'Ajoutez la ligne qui force https pendant un an.',
  'demo.https.code': 'Strict-Transport-Security: max-age=31536000',
  'demo.https.source': 'Guide MDN sur HSTS',
  'demo.frame.title': 'La page peut être affichée dans un cadre trompeur',
  'demo.frame.why':
    'Un autre site peut présenter le vôtre comme s’il lui appartenait.',
  'demo.frame.s1': 'Ajoutez l’en-tête qui interdit les cadres.',
  'demo.frame.s2': 'Choisissez d’interdire l’affichage hors de votre site.',
  'demo.frame.source': 'Guide MDN sur les cadres',
  'demo.image.title': 'Certaines images sont plus lourdes que nécessaire',
  'demo.image.why': 'La page met plus de temps à s’afficher sur un téléphone.',
  'demo.image.s1': 'Compressez chaque image au-dessus de 200 kilo-octets.',
  'demo.image.s2': 'Écrivez la largeur et la hauteur dans la page.',
  'demo.desc.title': 'La description de la page est trop courte',
  'demo.desc.why':
    'Le résultat de recherche explique mal le contenu de la page.',
  'demo.desc.s1': 'Rédigez une description d’environ 150 caractères.',
  'demo.desc.s2': 'Dites ce que la page permet de faire.',
  'demo.title.title': 'Le titre de la page est clair',
  'demo.title.why':
    'La personne reconnaît l’onglet et le résultat de recherche.',
  'demo.title.s1': 'Conservez un titre qui décrit cette page.',
  'demo.lang.title': 'La langue de la page est indiquée',
  'demo.lang.why': 'Le lecteur d’écran utilise la bonne prononciation.',
  'demo.lang.s1': 'Gardez l’attribut de langue sur la page.',
  'demo.cookie.title': 'Les cookies avant le choix n’ont pas été vus',
  'demo.cookie.why': 'Non testé : le navigateur d’audit n’a pas tourné.',
  'demo.cookie.s1': 'Relancez l’audit lorsque ce navigateur est disponible.',
  'reason.active_unverified': 'Non testé : ce test demande un site vérifié.',
  'reason.missing_source': 'Non testé : une source manque ({source}).',
  'reason.timeout': 'Non testé : le test a dépassé {seconds} s.',
  'reason.error': 'Non testé : une erreur est survenue pendant le test.',
  'reason.invalid_result': 'Non testé : le résultat obtenu est inutilisable.',
  'reason.runner_pending':
    'Le navigateur d’audit n’a pas encore fini. Ce résultat arrive bientôt.',
  'reason.runner_absent': 'Non testé : le navigateur d’audit n’a pas tourné.',
  'reason.browser_skipped':
    'Non testé : le navigateur d’audit n’a pas été lancé.',
  'api.error.method_not_allowed': 'Cette action n’est pas possible ici.',
  'api.error.unauthorized': 'Connectez-vous pour lancer ou lire un audit.',
  'api.error.invalid_input': 'La demande est incomplète. Vérifiez l’adresse.',
  'api.error.invalid_url':
    'Cette adresse ne convient pas. Exemple : https://exemple.fr',
  'api.error.site_not_found': 'Ce site ne figure pas dans votre liste.',
  'api.error.audit_not_found': 'Cet audit est introuvable.',
  'api.error.forbidden': 'Ce brief n’est pas disponible pour ce rapport.',
  'api.error.unverified':
    'Ce test demande un site vérifié. Vérifiez votre site, puis relancez.',
  'api.error.verification_not_found': 'Cette vérification est introuvable.',
  'api.error.user_limit':
    'Vous avez lancé 10 audits aujourd’hui. Réessayez demain.',
  'api.error.host_limit':
    'Ce site a été audité il y a moins de 15 minutes. Réessayez plus tard.',
  'api.error.probe_limit':
    'Trop de vérifications. Réessayez dans quelques minutes.',
  'api.error.internal':
    'Le service ne répond pas pour le moment. Réessayez dans quelques minutes.',
  'api.error.oauth_unconfigured':
    'La connexion Search Console n’est pas configurée.',
  'api.error.places_disabled': 'Les avis ne sont pas activés.',
  'api.error.places_absent': 'Ce lieu est introuvable.',
  'api.error.terms_version':
    'Cette version des conditions n’est plus en vigueur.',
  'api.error.places_limit':
    'Vous avez fait trop de recherches. Réessayez dans une heure.',
  'api.error.account_limit':
    'Vous avez trop sollicité votre compte. Réessayez plus tard.',
  'api.error.ip_limit':
    'Trop de lancements depuis ce réseau. Réessayez plus tard.',
  'api.error.guest_limit':
    'Trois audits ont déjà été lancés aujourd’hui depuis ce réseau.',
  'guest.gate.kicker': 'Sans compte',
  'guest.gate.title': 'Connectez-vous ou inscrivez-vous',
  'guest.gate.lead':
    'Trois audits par jour sont offerts sans compte. Le détail demande un compte.',
  'guest.gate.login': 'Connexion',
  'guest.gate.signup': 'Inscription',
  'guest.gate.close': 'Fermer',
  'api.error.rate_limited': 'Trop de demandes. Réessayez plus tard.',
  'api.error.unavailable':
    'La demande n’a pas pu être enregistrée. Réessayez plus tard.',
  'api.intake.accepted':
    'Demande reçue. Elle sera examinée après une preuve de propriété.',
  'reputation.avis.pass': 'Les avis publics sont favorables.',
  'reputation.avis.warn': 'Les avis publics sont mitigés.',
  'reputation.avis.fail': 'Les avis publics sont faibles.',
  'reputation.avis.unconfirmed': 'Choisissez le lieu pour afficher les avis.',
  'reputation.avis.none': 'Ce lieu n’a pas encore d’avis public.',
  'reputation.avis.quota': 'Non testé : le quota des avis est atteint.',
  'reputation.avis.error': 'Non testé : les avis n’ont pas répondu.',
  'reputation.avis.absent': 'Non testé : ce lieu est introuvable.',
  'reputation.avis.missing': 'Nous n’avons pas consulté les avis.',
  'cli.usage': 'Utilisation : audigy audit <adresse> [--json] [--browser]',
  'cli.error.command': 'Commande inconnue.',
  'cli.error.url': 'Adresse invalide. Exemple : https://exemple.fr',
  'cli.error.failed': 'L’audit n’a pas pu aboutir.',
  'cli.title': 'Audit de {url}',
  'cli.versions': 'Méthode {method}, moteur {engine}.',
  'cli.global':
    'Score global : {score} sur 100, {level}. Domaines notés : {scored} sur 8.',
  'cli.global_untested':
    'Score global : non testé. Aucun domaine n’a assez de tests.',
  'cli.domains': 'Domaines',
  'cli.domain': '{domain} : {score} sur 100, {level}',
  'cli.domain_untested': '{domain} : non testé',
  'cli.priorities': 'Corrections prioritaires',
  'cli.priorities_none': 'Aucune correction prioritaire.',
  'cli.untested': 'Non testé ({count})',
  'cli.browser.skipped':
    'Le navigateur d’audit n’a pas été lancé. Ajoutez --browser pour le lancer.',
  'cli.browser.absent':
    'Le navigateur d’audit est absent. Ses tests restent non testés.',
  'securite.fichiers.pass': 'Aucun fichier sensible connu n’est lisible.',
  'securite.fichiers.fail':
    'Un fichier sensible est lisible par tout le monde.',
  'securite.fichiers.fail_many':
    '{count} fichiers sensibles sont lisibles par tout le monde.',
  'securite.fichiers.untested':
    'Nous n’avons pas pu tester les fichiers sensibles.',
  'securite.listing.pass': 'Aucun dossier ne liste son contenu.',
  'securite.listing.fail': 'Un dossier affiche la liste de ses fichiers.',
  'securite.listing.untested':
    'Nous n’avons pas pu tester la liste des dossiers.',
  'securite.tls.pass':
    'Le site propose TLS 1.2 ou TLS 1.3, sans version plus ancienne.',
  'securite.tls.warn': 'Le site ne propose pas TLS 1.3. Il reste en TLS 1.2.',
  'securite.tls.fail': 'Le site accepte encore TLS 1.0 ou TLS 1.1.',
  'securite.tls.untested':
    'Nous n’avons pas pu tester les versions de chiffrement.',
  'securite.https.pass_redirect':
    'Les pages s’ouvrent en adresse chiffrée, et l’ancienne adresse y renvoie.',
  'securite.https.pass_no_http':
    'Les pages s’ouvrent en adresse chiffrée. L’ancienne adresse ne répond pas.',
  'securite.https.fail':
    'Le site s’ouvre sans chiffrement. Quelqu’un sur le réseau peut lire les échanges.',
  'securite.https.warn_off_host':
    'L’adresse non chiffrée part vers un autre nom. Le navigateur peut oublier la protection.',
  'securite.https.warn_delayed':
    'Le passage vers l’adresse chiffrée n’est pas immédiat. La première étape reste lisible.',
  'securite.hsts.pass':
    'Le navigateur refuse ensuite les adresses non chiffrées de ce site.',
  'securite.hsts.fail_missing':
    'Le navigateur peut encore tenter une adresse non chiffrée. La première visite reste exposée.',
  'securite.hsts.fail_invalid':
    'L’en-tête de durée de chiffrement est illisible. Le navigateur l’ignore.',
  'securite.hsts.fail_no_https':
    'Cette protection ne s’applique pas, le site n’a pas d’adresse chiffrée.',
  'securite.hsts.warn_short':
    'La protection contre l’adresse non chiffrée dure moins de six mois.',
  'securite.csp.pass':
    'Le site limite l’origine des scripts et des objets embarqués.',
  'securite.csp.fail_missing':
    'Aucune règle ne limite l’origine des scripts. Une page piégée peut en charger d’ailleurs.',
  'securite.csp.fail_invalid':
    'La règle d’origine des scripts est illisible. Le navigateur l’ignore.',
  'securite.csp.fail_unsafe':
    'La règle autorise des scripts trop larges. Une page piégée peut exécuter du code.',
  'securite.csp.warn_loose':
    'La règle bloque les scripts les plus risqués, mais elle reste trop ouverte.',
  'securite.xcto.pass':
    'Le navigateur respecte le type annoncé de chaque fichier.',
  'securite.xcto.warn_missing':
    'Le navigateur peut deviner le type d’un fichier. Un téléchargement peut alors s’exécuter.',
  'securite.xcto.fail':
    'Le type des fichiers est annoncé avec une valeur inconnue. Le navigateur l’ignore.',
  'securite.frames.pass':
    'Une autre page ne peut pas afficher la vôtre dans un cadre.',
  'securite.frames.fail':
    'Une autre page peut afficher la vôtre dans un cadre trompeur.',
  'securite.frames.warn_obsolete':
    'L’interdiction de cadre utilise une ancienne écriture. Les navigateurs actuels l’ignorent.',
  'securite.referrer.pass':
    'Le site limite l’adresse transmise quand un visiteur suit un lien.',
  'securite.referrer.pass_absent':
    'Aucun en-tête ne limite l’adresse envoyée. Les navigateurs récents la limitent déjà.',
  'securite.referrer.warn_legacy':
    'L’adresse complète part encore vers les autres sites chiffrés.',
  'securite.referrer.warn_unsafe':
    'Le site envoie trop d’adresse aux sites qui suivent. Un lien peut révéler la page.',
  'securite.referrer.fail_invalid':
    'L’en-tête qui limite l’adresse envoyée est illisible. Le navigateur l’ignore.',
  'securite.permissions.pass':
    'La caméra, le micro et la position sont refusés par défaut.',
  'securite.permissions.warn_missing':
    'La caméra, le micro ou la position peuvent encore être demandés.',
  'securite.permissions.fail_open':
    'Ces accès sont ouverts à tous les sites. Un cadre peut demander la caméra, le micro ou la position.',
  'securite.permissions.fail_invalid':
    'L’en-tête qui règle la caméra et le micro est illisible. Le navigateur l’ignore.',
  'securite.cookies.pass_none':
    'Aucune trace n’est déposée par la page sur votre navigateur.',
  'securite.cookies.pass':
    'Les traces déposées restent chiffrées, et le code de la page ne lit pas celles de session.',
  'securite.cookies.warn_hsts':
    'Une trace n’exige pas le chiffrement, mais l’adresse chiffrée est imposée.',
  'securite.cookies.fail_session_secure':
    'Une trace de session peut voyager sans chiffrement. Quelqu’un sur le réseau peut la copier.',
  'securite.cookies.fail_session_httponly':
    'Une trace de session est lisible par le code de la page. Un script piégé peut la prendre.',
  'securite.cookies.fail_secure':
    'Une trace peut voyager sans chiffrement. Elle peut être lue sur le réseau.',
  'securite.cookies.fail_samesite':
    'Une trace peut être envoyée depuis un autre site. Une action peut partir sans votre geste.',
  'securite.cookies.fail_prefix':
    'Une trace annonce un verrou que ses options contredisent. Le navigateur peut la refuser.',
  'securite.certificate.pass':
    'Le certificat est reconnu, au nom du site, pour encore {jours} jours.',
  'securite.certificate.fail_expired':
    'Le certificat est périmé. Les visiteurs voient une alerte et peuvent renoncer.',
  'securite.certificate.fail_not_yet':
    'Le certificat n’est pas encore valable. Les visiteurs voient une alerte.',
  'securite.certificate.fail_hostname':
    'Le certificat ne couvre pas le nom du site. Les visiteurs voient une alerte.',
  'securite.certificate.fail_chain':
    'Le navigateur ne reconnaît pas la chaîne du certificat. Les visiteurs voient une alerte.',
  'securite.certificate.warn_soon':
    'Le certificat expire dans {jours} jours. Après cette date, les visiteurs verront une alerte.',
  'securite.certificate.warn_today':
    'Le certificat expire dans moins d’un jour. Les visiteurs verront ensuite une alerte.',
  'securite.mixed.pass':
    'La page chiffrée ne charge aucun élément en adresse non chiffrée.',
  'securite.mixed.fail':
    'La page chiffrée charge du code en adresse non chiffrée. Ce code peut être modifié.',
  'securite.mixed.warn':
    'La page chiffrée charge des images ou des médias en adresse non chiffrée.',
  'securite.mixed.na_http':
    'Le contenu mixte ne s’applique pas, la page n’est pas chiffrée.',
  'securite.mixed.na_not_html':
    'Le contenu mixte n’est pas testé, la réponse n’est pas du HTML.',
  'securite.security_txt.pass':
    'Un fichier indique qui contacter en cas de faille, et il est encore valable.',
  'securite.security_txt.fail_missing':
    'Aucun fichier ne dit qui contacter si une faille est trouvée.',
  'securite.security_txt.fail_invalid':
    'Le fichier de contact est incomplet ou périmé. Personne ne sait qui écrire.',
  'securite.security_txt.warn_soon':
    'Le fichier de contact expire dans {jours} jours. Renouvelez-le avant cette date.',
  'securite.security_txt.warn_today':
    'Le fichier de contact expire dans moins d’un jour. Renouvelez-le maintenant.',
  'securite.security_txt.warn_legacy':
    'Le fichier de contact est à l’ancienne adresse. Placez-le dans le dossier prévu.',
  'securite.security_txt.warn_type':
    'Le fichier de contact n’est pas servi comme texte brut. Certains outils l’ignoreront.',
  'securite.security_txt.warn_canonical':
    'Le fichier de contact annonce une autre adresse que celle qui répond.',
  'securite.security_txt.untested_status':
    'Non testé : le fichier de contact a répondu {status}.',
  'securite.technologies.pass':
    'Technologies repérées : {liste}. Aucun en-tête n’annonce de numéro de version.',
  'securite.technologies.pass_aucune':
    'Ni le serveur ni la page n’annoncent de technologie connue.',
  'securite.technologies.warn':
    'Les en-têtes annoncent des versions : {liste}. Cela aide à cibler une faille connue. Masquez ces numéros.',
  'securite.technologies.untested':
    'Nous n’avons pas pu lire la page pour repérer ses technologies.',
  'securite.cve_scripts.fail_kev':
    'Version possiblement vulnérable : {liste}. Failles connues : {count}, dont une exploitée selon la CISA. Mettez à jour sans attendre.',
  'securite.cve_scripts.fail':
    'Version possiblement vulnérable : {liste}. Failles connues : {count}, dont au moins une grave. Mettez ces scripts à jour.',
  'securite.cve_scripts.warn':
    'Version possiblement vulnérable : {liste}. Failles connues : {count}, de gravité modérée. Prévoyez une mise à jour.',
  'securite.cve_scripts.pass':
    'Scripts reconnus : {liste}. OSV ne connaît aucune faille pour ces versions.',
  'securite.cve_scripts.pass_partiel':
    'Scripts reconnus : {liste}. OSV ne connaît aucune faille pour ces versions. Scripts non vérifiés : {count}.',
  'securite.cve_scripts.na_aucun':
    'Aucune bibliothèque connue n’a été repérée dans les scripts de la page.',
  'securite.cve_scripts.na_version':
    'Bibliothèques repérées sans version comparable : {liste}. Sans version sûre, nous ne signalons aucune faille.',
  'securite.cve_scripts.untested_page':
    'Nous n’avons pas pu lire la page, ni donc ses scripts.',
  'securite.cve_scripts.untested_scripts':
    'Nous n’avons pas pu lire tous les scripts de la page. Aucune bibliothèque n’a pu être comparée.',
  'securite.cve_scripts.untested_source':
    'Nous n’avons pas pu interroger la base de failles OSV.',
  'securite.cve_scripts.quota':
    'La base de failles OSV limite les demandes. Nous n’avons pas pu tester ces scripts.',
  'securite.cve_scripts.missing_api':
    'Non testé : la connexion aux bases de failles n’est pas configurée.',
  'securite.cve_logiciels.fail_kev':
    'Version possiblement vulnérable : {liste}. Failles connues : {count}, dont une exploitée selon la CISA. Mettez à jour sans attendre.',
  'securite.cve_logiciels.fail':
    'Version possiblement vulnérable : {liste}. Failles connues : {count}, dont au moins une grave. Mettez ces logiciels à jour.',
  'securite.cve_logiciels.warn':
    'Version possiblement vulnérable : {liste}. Failles connues : {count}, de gravité modérée. Prévoyez une mise à jour.',
  'securite.cve_logiciels.warn_distribution':
    'Version possiblement vulnérable : {liste}. Votre distribution corrige parfois sans changer ce numéro. Vérifiez ses mises à jour.',
  'securite.cve_logiciels.pass':
    'Logiciels reconnus : {liste}. Aucune faille publiée pour ces versions.',
  'securite.cve_logiciels.pass_partiel':
    'Logiciels reconnus : {liste}. Aucune faille publiée pour ces versions. Logiciels non vérifiés : {count}.',
  'securite.cve_logiciels.na_aucun':
    'Aucun logiciel serveur n’est annoncé par le site.',
  'securite.cve_logiciels.na_version':
    'Logiciels repérés : {liste}. Sans version complète ni base fiable, nous ne signalons aucune faille.',
  'securite.cve_logiciels.na_outil':
    'Le site est construit avec {liste}. Cet outil ne tourne pas sur le site publié.',
  'securite.cve_logiciels.na_hebergeur':
    'Le serveur est géré par {liste}. L’hébergeur applique lui-même ses correctifs.',
  'securite.cve_logiciels.untested_page':
    'Nous n’avons pas pu lire la page pour repérer ses logiciels.',
  'securite.cve_logiciels.untested_source':
    'Nous n’avons pas pu interroger les bases de failles NVD et OSV.',
  'securite.cve_logiciels.quota':
    'Une base de failles limite les demandes. Nous n’avons pas pu tester ces logiciels.',
  'securite.cve_logiciels.missing_api':
    'Non testé : la connexion aux bases de failles n’est pas configurée.',
  'performance.lighthouse.pass':
    'La vitesse mesurée est bonne : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'performance.lighthouse.warn':
    'La vitesse mesurée est moyenne : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'performance.lighthouse.fail':
    'La vitesse mesurée est trop faible : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'performance.lighthouse.partial':
    'Une des deux mesures de vitesse manque. Le score obtenu est {score} sur 100.',
  'performance.lcp.pass':
    'Les visiteurs voient l’essentiel en {secondes} secondes, ce qui est rapide.',
  'performance.lcp.warn':
    'Les visiteurs voient l’essentiel en {secondes} secondes, ce qui est un peu lent.',
  'performance.lcp.fail':
    'Les visiteurs voient l’essentiel en {secondes} secondes, ce qui est trop lent.',
  'performance.inp.pass':
    'Le site répond en {millisecondes} millisecondes. Les actions restent fluides.',
  'performance.inp.warn':
    'Le site répond en {millisecondes} millisecondes. L’attente peut gêner.',
  'performance.inp.fail':
    'Le site répond en {millisecondes} millisecondes. L’attente est trop longue.',
  'performance.cls.pass':
    'La page reste stable pendant le chargement. Le décalage mesuré est {valeur}.',
  'performance.cls.warn':
    'La page bouge un peu pendant le chargement. Le décalage mesuré est {valeur}.',
  'performance.cls.fail':
    'La page bouge trop pendant le chargement. Le décalage mesuré est {valeur}.',
  'performance.field.absent':
    'Nous n’avons pas de données de visite réelle pour ce site.',
  'performance.field.metric_absent':
    'Cette mesure de visite réelle n’est pas fournie pour ce site.',
  'performance.poids.pass':
    'La page pèse {poids}. Ce poids reste raisonnable pour l’affichage.',
  'performance.poids.warn':
    'La page pèse {poids}. Ce poids ralentit l’affichage.',
  'performance.poids.fail':
    'La page pèse {poids}. Ce poids ralentit fortement l’affichage.',
  'performance.poids.pass_sans_valeur':
    'Le poids de la page reste raisonnable.',
  'performance.poids.warn_sans_valeur':
    'Le poids de la page alourdit l’affichage.',
  'performance.poids.fail_sans_valeur':
    'Le poids de la page ralentit fortement l’affichage.',
  'performance.cache.pass':
    'Le navigateur peut garder les fichiers déjà téléchargés.',
  'performance.cache.warn':
    'Certains fichiers sont rechargés trop souvent. La page met plus de temps.',
  'performance.cache.fail':
    'Les fichiers sont rechargés presque à chaque visite. La page met plus de temps.',
  'performance.compression.pass':
    'Les textes de la page sont compressés avant l’envoi.',
  'performance.compression.warn':
    'Une partie des textes n’est pas compressée. L’envoi est plus lent.',
  'performance.compression.fail':
    'Les textes de la page ne sont pas compressés. L’envoi est plus lent.',
  'performance.audit.na': 'Cette mesure ne s’applique pas à cette page.',
  'performance.quota':
    'Nous n’avons pas pu tester : le quota de mesure est atteint.',
  'performance.missing_key':
    'Non testé : la source de mesure n’est pas configurée.',
  'performance.error': 'Non testé : la mesure de vitesse a échoué.',
  'seo.page.untested_status': 'Non testé : la page a répondu {status}.',
  'seo.page.na_not_html':
    'La page n’est pas au format HTML. Ce contrôle ne s’applique pas.',
  'seo.lighthouse.pass':
    'Le référencement mesuré est bon : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'seo.lighthouse.warn':
    'Le référencement mesuré est moyen : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'seo.lighthouse.fail':
    'Le référencement mesuré est faible : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'seo.lighthouse.partial':
    'Une des deux mesures de référencement manque. Le score obtenu est {score} sur 100.',
  'seo.lighthouse.missing_key':
    'Non testé : la source de mesure n’est pas configurée.',
  'seo.lighthouse.quota': 'Non testé : le quota de mesure est atteint.',
  'seo.lighthouse.error': 'Non testé : la mesure de référencement a échoué.',
  'seo.lighthouse.absent': 'Non testé : la note de référencement est absente.',
  'accessibilite.lighthouse.pass':
    'L’accès mesuré est bon : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'accessibilite.lighthouse.warn':
    'L’accès mesuré est moyen : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'accessibilite.lighthouse.fail':
    'L’accès mesuré est faible : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'accessibilite.lighthouse.partial':
    'Une des deux mesures d’accès manque. Le score obtenu est {score} sur 100.',
  'accessibilite.lighthouse.missing_key':
    'Non testé : la source de mesure n’est pas configurée.',
  'accessibilite.lighthouse.quota':
    'Non testé : le quota de mesure est atteint.',
  'accessibilite.lighthouse.error': 'Non testé : la mesure d’accès a échoué.',
  'accessibilite.lighthouse.absent': 'Non testé : la note d’accès est absente.',
  'seo.robots.pass':
    'Le fichier robots laisse les moteurs explorer cette adresse.',
  'seo.robots.pass_absent':
    'Aucun fichier robots n’est publié. Les moteurs peuvent explorer le site.',
  'seo.robots.fail_block':
    'Le fichier robots interdit l’exploration de cette adresse. Elle peut sortir des résultats.',
  'seo.robots.fail_html':
    'Le fichier robots n’est pas un texte de règles. Les moteurs peuvent l’ignorer.',
  'seo.robots.untested_status':
    'Non testé : le fichier robots a répondu {status}.',
  'seo.robots.na_scope':
    'Le fichier robots est à la racine du domaine, hors du chemin audité.',
  'seo.sitemap.pass': 'Le plan du site est lisible et ses adresses répondent.',
  'seo.sitemap.pass_sample':
    'Le plan du site est lisible. Les {count} premières adresses sur {total} répondent.',
  'seo.sitemap.warn_missing':
    'Aucun plan du site n’est publié. Les moteurs découvrent les pages plus lentement.',
  'seo.sitemap.warn_redirect':
    'Certaines adresses du plan changent de page. Le plan devrait citer l’adresse finale.',
  'seo.sitemap.warn_external':
    'Le plan cite des adresses d’un autre site. Seules celles de ce site ont été vérifiées.',
  'seo.sitemap.fail_status_one':
    '1 adresse du plan ne répond pas. Les moteurs peuvent ignorer cette page.',
  'seo.sitemap.fail_status_many':
    '{count} adresses du plan ne répondent pas. Les moteurs peuvent ignorer ces pages.',
  'seo.sitemap.fail_xml':
    'Le plan du site n’est pas un fichier lisible. Les moteurs ne peuvent pas l’utiliser.',
  'seo.sitemap.fail_empty':
    'Le plan du site ne contient aucune adresse. Les moteurs n’y trouvent rien.',
  'seo.sitemap.fail_file':
    'Le plan annoncé ne répond pas. Les moteurs ne peuvent pas le lire.',
  'seo.sitemap.untested_status':
    'Non testé : le plan du site a répondu {status}.',
  'seo.sitemap.na_scope':
    'Le plan du site est à la racine du domaine, hors du chemin audité.',
  'seo.noindex.pass':
    'La page peut apparaître dans les résultats de recherche.',
  'seo.noindex.fail':
    'La page demande à rester hors des résultats. Les moteurs ne l’afficheront pas.',
  'seo.canonical.pass': 'L’adresse de référence est celle de cette page.',
  'seo.canonical.warn_missing':
    'La page n’indique pas son adresse de référence. Un doublon peut prendre sa place.',
  'seo.canonical.warn_other':
    'L’adresse de référence pointe vers une autre page. Les visites peuvent s’y concentrer.',
  'seo.canonical.warn_repeat':
    'L’adresse de référence est écrite plusieurs fois. Une seule suffit.',
  'seo.canonical.fail_conflict':
    'La page indique plusieurs adresses de référence. Les moteurs ne savent pas laquelle garder.',
  'seo.canonical.fail_other_host':
    'L’adresse de référence pointe vers un autre site. Cette page peut sortir des résultats.',
  'seo.canonical.fail_invalid':
    'L’adresse de référence est illisible. Les moteurs ne peuvent pas l’utiliser.',
  'seo.title.pass':
    'Le titre décrit la page et tient dans le résultat de recherche.',
  'seo.title.warn_short':
    'Le titre ne fait que {count} caractères. Il décrit trop peu la page.',
  'seo.title.warn_long':
    'Le titre fait {count} caractères. La fin sera coupée dans le résultat.',
  'seo.title.fail_missing':
    'La page n’a pas de titre. Le résultat de recherche reste vague.',
  'seo.title.fail_duplicate':
    'La page a plusieurs titres différents. Le résultat de recherche devient ambigu.',
  'seo.title.warn_repeat':
    'Le titre est répété plusieurs fois. Un seul titre suffit.',
  'seo.description.pass':
    'La description résume la page dans le résultat de recherche.',
  'seo.description.warn_missing':
    'La page n’a pas de description. Le résultat de recherche est choisi à votre place.',
  'seo.description.warn_short':
    'La description ne fait que {count} caractères. Elle explique trop peu la page.',
  'seo.description.warn_long':
    'La description fait {count} caractères. La fin sera coupée dans le résultat.',
  'seo.description.warn_same':
    'Le titre et la description répètent le même texte. Le résultat de recherche est pauvre.',
  'seo.description.warn_duplicate':
    'La page a plusieurs descriptions différentes. Le résultat de recherche devient ambigu.',
  'seo.description.warn_repeat':
    'La description est répétée plusieurs fois. Une seule suffit.',
  'seo.hreflang.pass':
    'Les langues déclarées ont une adresse et cette page s’y cite.',
  'seo.hreflang.na':
    'Aucune autre langue n’est déclarée. Rien à signaler si le site est en une langue.',
  'seo.hreflang.warn_self':
    'La page ne se cite pas parmi ses langues. Les moteurs peuvent ignorer le lien.',
  'seo.hreflang.warn_relative':
    'Une langue pointe vers une adresse relative. Les moteurs demandent une adresse complète.',
  'seo.hreflang.fail_lang':
    'Un code de langue est invalide. Les moteurs ignorent cette déclaration.',
  'seo.hreflang.fail_conflict':
    'Une langue vise deux adresses. Les moteurs ne savent pas laquelle choisir.',
  'seo.hreflang.fail_href':
    'Une langue n’a pas d’adresse utilisable. Les moteurs ignorent cette déclaration.',
  'seo.jsonld.pass':
    'La page décrit son contenu pour les moteurs, avec le type {type}.',
  'seo.jsonld.warn_missing':
    'La page ne décrit pas son contenu aux moteurs. Le résultat de recherche reste pauvre.',
  'seo.jsonld.warn_type':
    'Le type {type} n’est pas dans la liste de base. La lecture peut rester incomplète.',
  'seo.jsonld.fail_parse':
    'Une donnée structurée est illisible. Les moteurs l’ignorent.',
  'seo.jsonld.fail_type':
    'Une donnée structurée n’a pas de type. Les moteurs l’ignorent.',
  'seo.gsc.untested_connect': 'Nous n’avons pas pu tester l’indexation Google.',
  'seo.gsc.untested_property':
    'Ce site ne correspond à aucune propriété Search Console.',
  'seo.gsc.untested_quota': 'Non testé : le quota Search Console est atteint.',
  'seo.gsc.untested_auth': 'La connexion Search Console a expiré.',
  'seo.gsc.untested_error': 'Non testé : Search Console n’a pas répondu.',
  'seo.gsc_sitemaps.pass':
    'Les plans envoyés à Google ne signalent pas d’erreur.',
  'seo.gsc_sitemaps.warn_none': 'Aucun plan de site n’est envoyé à Google.',
  'seo.gsc_sitemaps.warn_pending':
    'Les plans envoyés à Google sont encore en attente.',
  'seo.gsc_sitemaps.warn_warnings':
    'Google signale des avertissements sur vos plans de site.',
  'seo.gsc_sitemaps.fail': 'Google signale des erreurs dans vos plans de site.',
  'seo.gsc_inspection.pass': 'Google a indexé la page d’accueil.',
  'seo.gsc_inspection.warn':
    'Google connaît la page d’accueil, sans l’indexer pleinement.',
  'seo.gsc_inspection.fail': 'Google n’indexe pas la page d’accueil.',
  'seo.gsc_indexed.pass': 'Google a indexé la plupart des pages annoncées.',
  'seo.gsc_indexed.warn_partial':
    'Une partie des pages annoncées n’est pas encore indexée.',
  'seo.gsc_indexed.warn_none':
    'Aucune page n’est annoncée dans les plans envoyés.',
  'seo.gsc_indexed.fail': 'Aucune des pages annoncées n’est indexée.',
  'dns_email.na_github':
    'Ce nom est sur github.io. Le courrier et le DNS du domaine ne se règlent pas ici.',
  'dns_email.na_address':
    'Une adresse IP n’a pas de réglage de courrier. Ce test ne s’applique pas.',
  'dns_email.untested': 'Non testé : le DNS n’a pas répondu.',
  'dns_email.mx.pass': 'Des serveurs de courrier sont annoncés pour ce nom.',
  'dns_email.mx.pass_null':
    'Ce nom refuse le courrier. C’est annoncé clairement.',
  'dns_email.mx.warn_absent':
    'Aucun serveur de courrier n’est annoncé. Un message peut viser l’adresse du site.',
  'dns_email.mx.fail_mix':
    'Le refus de courrier est mélangé à d’autres serveurs. Le réglage est incohérent.',
  'dns_email.mx.fail_syntax':
    'L’annonce des serveurs de courrier est illisible.',
  'dns_email.spf.pass':
    'Seuls les serveurs annoncés peuvent envoyer du courrier avec ce nom.',
  'dns_email.spf.pass_refuse':
    'Ce nom interdit tout envoi de courrier à son sujet.',
  'dns_email.spf.fail_missing':
    'Rien n’indique qui peut envoyer du courrier avec ce nom. N’importe qui peut l’imiter.',
  'dns_email.spf.fail_open':
    'Ce nom n’interdit pas les faux envois. N’importe qui peut l’imiter.',
  'dns_email.spf.fail_multiple':
    'Plusieurs annonces d’expéditeurs se contredisent. Les serveurs de courrier les ignorent.',
  'dns_email.spf.fail_syntax':
    'L’annonce des expéditeurs autorisés est illisible. Elle est ignorée.',
  'dns_email.spf.fail_plus':
    'Tout le monde peut envoyer du courrier avec ce nom. Retirez cette autorisation.',
  'dns_email.spf.fail_lookups':
    'L’annonce demande {lookups} consultations DNS. Au-delà de 10, elle est ignorée.',
  'dns_email.spf.fail_void':
    'Trop de noms cités n’existent pas. L’annonce des expéditeurs est ignorée.',
  'dns_email.spf.fail_loop':
    'L’annonce des expéditeurs se renvoie à elle-même. Elle est ignorée.',
  'dns_email.spf.warn_soft':
    'Les faux messages sont signalés, pas refusés. Une partie peut encore arriver.',
  'dns_email.spf.warn_neutral':
    'L’annonce ne tranche pas. Un faux message peut partir avec ce nom.',
  'dns_email.spf.warn_ptr':
    'L’annonce s’appuie sur un mécanisme déconseillé. Les contrôles deviennent fragiles.',
  'dns_email.spf.warn_macro':
    'L’annonce varie selon l’expéditeur. Le nombre de consultations n’est pas certain.',
  'dns_email.dmarc.pass':
    'Les faux messages sont refusés, et un rapport est prévu.',
  'dns_email.dmarc.pass_reject': 'Les faux messages pour ce nom sont refusés.',
  'dns_email.dmarc.fail_missing':
    'Rien ne dit quoi faire des faux messages. Ils peuvent arriver en boîte.',
  'dns_email.dmarc.fail_spoof':
    'Ce nom peut être imité. Refusez les faux messages, puisqu’il n’envoie pas de courrier.',
  'dns_email.dmarc.fail_not_reject':
    'Ce nom n’envoie pas de courrier, mais les faux messages ne sont pas tous refusés.',
  'dns_email.dmarc.fail_syntax':
    'La règle sur les faux messages est illisible. Elle est ignorée.',
  'dns_email.dmarc.fail_multiple':
    'Plusieurs règles se contredisent. Les serveurs de courrier les ignorent.',
  'dns_email.dmarc.warn_none':
    'Les faux messages sont seulement observés. Ils peuvent encore arriver.',
  'dns_email.dmarc.warn_quarantine':
    'Les faux messages vont en indésirables. Ils ne sont pas tous refusés.',
  'dns_email.dmarc.warn_pct':
    'La règle ne couvre que {pct} pour cent des messages. Le reste passe.',
  'dns_email.dmarc.warn_rua':
    'Aucun rapport ne vous prévient des faux messages. Vous ne les verrez pas.',
  'dns_email.dkim.pass':
    'Une signature de courrier est annoncée ({selectors}).',
  'dns_email.dkim.warn_missing':
    'Aucune signature courante n’est annoncée. Le courrier peut quand même en avoir une.',
  'dns_email.dkim.warn_invalid':
    'Une signature annoncée est inutilisable. Les serveurs peuvent l’ignorer.',
  'dns_email.dkim.na_nomail':
    'Sans courrier, une signature n’est pas nécessaire.',
  'dns_email.caa.pass':
    'Seuls les organismes cités peuvent créer un certificat pour ce nom.',
  'dns_email.caa.pass_none':
    'Aucun organisme n’est autorisé à créer un certificat pour ce nom.',
  'dns_email.caa.warn_missing':
    'N’importe quel organisme peut créer un certificat pour ce nom.',
  'dns_email.caa.fail_syntax':
    'La liste des organismes autorisés est illisible.',
  'dns_email.caa.fail_critical':
    'Une contrainte inconnue bloque la lecture de cette liste.',
  'dns_email.dnssec.pass':
    'Le nom est signé. Un faux serveur DNS est plus difficile à glisser.',
  'dns_email.dnssec.fail':
    'Le nom n’est pas signé (DNSSEC). Un faux serveur DNS peut répondre à sa place.',
  'dns_email.mta_sts.pass':
    'Les serveurs de courrier exigent un chiffrement, et le fichier de règle est en place.',
  'dns_email.mta_sts.warn_missing':
    'Le chiffrement du courrier n’est pas exigé. Un intermédiaire peut le retirer.',
  'dns_email.mta_sts.warn_testing':
    'La règle de chiffrement est en essai. Elle n’est pas encore imposée.',
  'dns_email.mta_sts.warn_none':
    'La règle de chiffrement est désactivée. Elle ne protège pas le courrier.',
  'dns_email.mta_sts.fail_policy':
    'L’annonce de chiffrement existe, mais le fichier de règle est absent.',
  'dns_email.mta_sts.fail_syntax':
    'L’annonce de chiffrement du courrier est illisible.',
  'dns_email.mta_sts.na_nomail':
    'Sans courrier entrant, cette règle de chiffrement ne s’applique pas.',
  'dns_email.mta_sts.untested':
    'Non testé : le fichier de règle n’a pas répondu.',
  'dns_email.tls_rpt.pass':
    'Les échecs de chiffrement du courrier vous sont signalés.',
  'dns_email.tls_rpt.warn_missing':
    'Les échecs de chiffrement du courrier ne vous sont pas signalés.',
  'dns_email.tls_rpt.fail_syntax':
    'L’annonce des rapports de chiffrement est illisible.',
  'dns_email.tls_rpt.na_nomail':
    'Sans courrier entrant, ces rapports ne s’appliquent pas.',
  'qualite.na_robots':
    'Le fichier robots interdit cette adresse. Ce contrôle ne s’applique pas.',
  'qualite.untested_robots':
    'Non testé : le fichier robots a répondu {status}.',
  'qualite.untested_robots_down':
    'Non testé : le fichier robots n’a pas répondu.',
  'qualite.untested_status': 'Non testé : la page a répondu {status}.',
  'qualite.untested_down': 'Non testé : la page n’a pas répondu.',
  'qualite.na_not_html':
    'La page n’est pas au format HTML. Ce contrôle ne s’applique pas.',
  'qualite.na_scope':
    'La page demandée quitte la zone auditée. La suite n’est pas lue.',
  'qualite.untested_budget': 'Non testé : le budget de requêtes est atteint.',
  'qualite.liens.pass': 'Les liens vérifiés répondent.',
  'qualite.liens.fail_internal_one':
    '1 lien interne ne répond pas. La page citée est inaccessible.',
  'qualite.liens.fail_internal_many':
    '{count} liens internes ne répondent pas. Ces pages sont inaccessibles.',
  'qualite.liens.fail_external_one':
    '1 lien vers un autre site est introuvable.',
  'qualite.liens.fail_external_many':
    '{count} liens vers d’autres sites sont introuvables.',
  'qualite.liens.warn_temp_one':
    '1 lien externe a eu une erreur temporaire. Ce n’est pas un lien mort.',
  'qualite.liens.warn_temp_many':
    '{count} liens externes ont eu une erreur temporaire. Ce n’est pas un lien mort.',
  'qualite.liens.warn_uncertain_one':
    '1 lien externe n’a pas répondu clairement. Ce n’est pas un lien mort.',
  'qualite.liens.warn_uncertain_many':
    '{count} liens externes n’ont pas répondu clairement. Ce n’est pas un lien mort.',
  'qualite.html.pass':
    'Le HTML des pages lues respecte les règles essentielles.',
  'qualite.html.fail_one':
    '1 page a du HTML invalide. Un navigateur peut mal l’afficher.',
  'qualite.html.fail_many':
    '{count} pages ont du HTML invalide. Un navigateur peut mal les afficher.',
  'qualite.images_poids.pass': 'Les images mesurées restent sous 200 Ko.',
  'qualite.images_poids.fail_one':
    '1 image dépasse 200 Ko. Elle ralentit l’affichage.',
  'qualite.images_poids.fail_many':
    '{count} images dépassent 200 Ko. Elles ralentissent l’affichage.',
  'qualite.images_poids.warn_unknown_one':
    'La taille d’une image n’est pas indiquée. Son poids n’est pas vérifié.',
  'qualite.images_poids.warn_unknown_many':
    'La taille de {count} images n’est pas indiquée. Leur poids n’est pas vérifié.',
  'qualite.images_poids.na': 'Aucune image n’est à mesurer sur les pages lues.',
  'qualite.images_dimensions.pass':
    'Chaque image indique sa largeur et sa hauteur.',
  'qualite.images_dimensions.warn_one':
    '1 image n’a pas ses dimensions. La page peut bouger au chargement.',
  'qualite.images_dimensions.warn_many':
    '{count} images n’ont pas leurs dimensions. La page peut bouger au chargement.',
  'qualite.images_dimensions.fail':
    'Aucune image n’a de largeur ni de hauteur. La page peut bouger au chargement.',
  'qualite.images_dimensions.na':
    'Aucune image n’est affichée sur les pages lues.',
  'qualite.images_format.pass':
    'Les images proposent un format moderne, WebP ou AVIF.',
  'qualite.images_format.warn_one':
    '1 image reste dans un ancien format. Elle pèse plus que nécessaire.',
  'qualite.images_format.warn_many':
    '{count} images restent dans un ancien format. Elles pèsent plus que nécessaire.',
  'qualite.images_format.fail':
    'Aucune image n’utilise un format moderne. Elles pèsent plus que nécessaire.',
  'qualite.images_format.na':
    'Aucune image bitmap n’est affichée. Ce contrôle ne s’applique pas.',
  'ecologie.missing_key':
    'Non testé : la mesure de la page n’est pas configurée.',
  'ecologie.psi_quota':
    'Non testé : le quota de mesure de la page est atteint.',
  'ecologie.psi_error': 'Non testé : la mesure de la page a échoué.',
  'ecologie.missing_api':
    'Non testé : la source d’annuaire n’est pas branchée.',
  'ecologie.quota': 'Non testé : le quota de l’annuaire est atteint.',
  'ecologie.error': 'Non testé : l’annuaire des hébergeurs n’a pas répondu.',
  'ecologie.ecoindex.pass':
    'Estimation : la page obtient {score} sur 100, lettre {lettre}. Pas une mesure exacte.',
  'ecologie.ecoindex.warn':
    'Estimation : la page obtient {score} sur 100, lettre {lettre}, un résultat moyen. Pas une mesure exacte.',
  'ecologie.ecoindex.fail':
    'Estimation : la page obtient {score} sur 100, lettre {lettre}, un résultat faible. Pas une mesure exacte.',
  'ecologie.ecoindex.pass_une':
    'Estimation : {score} sur 100, lettre {lettre}, d’après une seule mesure. Pas une mesure exacte.',
  'ecologie.ecoindex.warn_une':
    'Estimation : {score} sur 100, lettre {lettre}, un résultat moyen sur une seule mesure. Pas une mesure exacte.',
  'ecologie.ecoindex.fail_une':
    'Estimation : {score} sur 100, lettre {lettre}, un résultat faible sur une seule mesure. Pas une mesure exacte.',
  'ecologie.ecoindex.incomplete':
    'Nous n’avons pas pu estimer l’EcoIndex : il manque {manque}. Sans ces mesures, l’estimation serait trompeuse.',
  'ecologie.co2.pass':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}. Pas une mesure exacte.',
  'ecologie.co2.warn':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}, au-dessus des pages légères. Pas une mesure exacte.',
  'ecologie.co2.fail':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}, au-dessus de la médiane. Pas une mesure exacte.',
  'ecologie.co2.pass_vert':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}, hébergeur listé comme vert. Pas une mesure exacte.',
  'ecologie.co2.warn_vert':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}, hébergeur listé comme vert. Pas une mesure exacte.',
  'ecologie.co2.fail_vert':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}, hébergeur listé comme vert. Pas une mesure exacte.',
  'ecologie.co2.pass_inconnu':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}. L’hébergeur n’a pas pu être confirmé. Pas une mesure exacte.',
  'ecologie.co2.warn_inconnu':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}, au-dessus des pages légères. L’hébergeur n’a pas pu être confirmé. Pas une mesure exacte.',
  'ecologie.co2.fail_inconnu':
    'Estimation : environ {grammes} grammes de CO2 par visite, lettre {lettre}, au-dessus de la médiane. L’hébergeur n’a pas pu être confirmé. Pas une mesure exacte.',
  'ecologie.co2.incomplete':
    'Nous n’avons pas pu estimer le CO2 : le poids de la page manque. Sans ce poids, l’estimation serait trompeuse.',
  'ecologie.hebergeur.pass':
    'L’annuaire indique {nom} parmi les hébergeurs à électricité renouvelable. Cela ne couvre pas toute la chaîne d’hébergement.',
  'ecologie.hebergeur.pass_anonyme':
    'L’annuaire indique un hébergeur à électricité renouvelable. Cela ne couvre pas toute la chaîne d’hébergement.',
  'ecologie.hebergeur.fail':
    'L’annuaire ne liste pas cet hébergeur comme alimenté en électricité renouvelable. Cela ne couvre pas toute la chaîne d’hébergement.',
  'ecologie.hebergeur.ip':
    'Non testé : l’annuaire attend un nom de domaine, pas une adresse de machine.',
  'ecologie.rgesn_budget.pass':
    'Cette page pèse {poids} et envoie {requetes} requêtes, sous les repères. Le référentiel demande aussi un objectif écrit, invisible ici.',
  'ecologie.rgesn_budget.warn':
    'Cette page pèse {poids} et envoie {requetes} requêtes. Le repère visé est 1 Mo et 30 requêtes.',
  'ecologie.rgesn_budget.fail':
    'Cette page pèse {poids} et envoie {requetes} requêtes. C’est au-dessus de 2 Mo ou de 100 requêtes.',
  'ecologie.rgesn_budget.warn_poids':
    'Cette page pèse {poids}. Le nombre de requêtes n’a pas été mesuré.',
  'ecologie.rgesn_budget.fail_poids':
    'Cette page pèse {poids}, au-dessus du repère. Les requêtes n’ont pas été mesurées.',
  'ecologie.rgesn_budget.warn_requetes':
    'Cette page fait {requetes} requêtes. Le poids n’a pas été mesuré.',
  'ecologie.rgesn_budget.fail_requetes':
    'Cette page fait {requetes} requêtes, au-dessus du repère. Le poids n’a pas été mesuré.',
  'ecologie.rgesn_budget.incomplete':
    'Nous n’avons pas pu tester le budget de la page : le poids et les requêtes manquent.',
  'ecologie.rgesn_cache.pass':
    'Sur cette page, les fichiers déjà vus peuvent rester en mémoire. Pas une stratégie globale.',
  'ecologie.rgesn_cache.warn':
    'Sur cette page, certains fichiers sont rechargés trop souvent. Pas une stratégie globale.',
  'ecologie.rgesn_cache.fail':
    'Sur cette page, les fichiers sont rechargés presque à chaque visite. Pas une stratégie globale.',
  'ecologie.rgesn_cache.na':
    'Cette mesure de cache ne s’applique pas à cette page.',
  'ecologie.rgesn_compression.pass':
    'Sur cette page, les textes sont compressés avant l’envoi. Pas une stratégie globale.',
  'ecologie.rgesn_compression.warn':
    'Sur cette page, une partie des textes n’est pas compressée. Pas une stratégie globale.',
  'ecologie.rgesn_compression.fail':
    'Sur cette page, les textes ne sont pas compressés. Pas une stratégie globale.',
  'ecologie.rgesn_compression.na':
    'Cette mesure de compression ne s’applique pas à cette page.',
  'ecologie.rgesn_polices.pass':
    'Les polices téléchargées restent dans la limite : {fichiers} fichiers, {poids}. Le nombre de familles distinctes n’est pas visible.',
  'ecologie.rgesn_polices.pass_sans_poids':
    'Les polices téléchargées restent dans la limite : {fichiers} fichiers. Le poids de ces polices n’a pas été mesuré.',
  'ecologie.rgesn_polices.pass_aucune':
    'Aucune police n’est téléchargée pour cette page.',
  'ecologie.rgesn_polices.warn':
    'Les polices sont nombreuses : {fichiers} fichiers, {poids}. Visez deux polices, ou 400 Ko.',
  'ecologie.rgesn_polices.warn_sans_poids':
    'Les polices sont nombreuses : {fichiers} fichiers. Le poids n’a pas été mesuré.',
  'ecologie.rgesn_polices.fail':
    'Les polices dépassent la limite : {fichiers} fichiers, {poids}. Visez deux polices, ou 400 Ko.',
  'ecologie.rgesn_polices.incomplete':
    'Nous n’avons pas pu compter les polices téléchargées sur cette page.',
  'ecologie.rgesn_images.pass':
    'Sur cette page, {part} des images matricielles utilisent un format léger. Le sujet de chaque image n’est pas jugé.',
  'ecologie.rgesn_images.warn':
    'Sur cette page, seulement {part} des images matricielles utilisent un format léger. Le sujet de chaque image n’est pas jugé.',
  'ecologie.rgesn_images.fail':
    'Sur cette page, {part} des images matricielles utilisent un format léger. Le sujet de chaque image n’est pas jugé.',
  'ecologie.rgesn_images.na':
    'Aucune image matricielle n’est à juger sur cette page.',
  'ecologie.rgesn_images.incomplete':
    'Nous n’avons pas pu lire le format des images de cette page.',
  'rgesn.intro':
    'Ces questions complètent les mesures automatiques. Répondez pour votre service.',
  'rgesn.theme.strategie': 'Stratégie',
  'rgesn.theme.specifications': 'Spécifications',
  'rgesn.theme.architecture': 'Architecture',
  'rgesn.theme.ux': 'Interface',
  'rgesn.theme.contenus': 'Contenus',
  'rgesn.theme.frontend': 'Interface technique',
  'rgesn.theme.backend': 'Serveur',
  'rgesn.theme.hebergement': 'Hébergement',
  'rgesn.theme.algorithmie': 'Calculs avancés',
  'rgesn.answer.oui': 'Oui',
  'rgesn.answer.partiel': 'En partie',
  'rgesn.answer.non': 'Non',
  'rgesn.answer.na': 'Sans objet',
  'rgesn.1.1': 'Avez-vous évalué l’utilité du service face à ses impacts ?',
  'rgesn.1.2': 'Avez-vous décrit les personnes visées et leurs besoins réels ?',
  'rgesn.1.3': 'Un référent en écoconception est-il nommé pour ce service ?',
  'rgesn.1.4': 'Revoyez-vous régulièrement le respect de votre démarche ?',
  'rgesn.1.5': 'Vous êtes-vous fixé des objectifs de réduction d’impact ?',
  'rgesn.1.6': 'La collecte de données est-elle limitée au besoin du service ?',
  'rgesn.1.7': 'Le chiffrement est-il proportionné aux besoins du service ?',
  'rgesn.1.8': 'Avez-vous publié une partie du service en code ouvert ?',
  'rgesn.1.9':
    'Le service repose-t-il sur des standards ouverts et interopérables ?',
  'rgesn.1.10':
    'Les échanges avec le matériel passent-ils par des API ouvertes ?',
  'rgesn.2.1':
    'Avez-vous listé les appareils qui peuvent utiliser le service ?',
  'rgesn.2.2': 'Le service fonctionne-t-il encore sur d’anciens appareils ?',
  'rgesn.2.3': 'Le service reste-t-il utilisable avec une connexion lente ?',
  'rgesn.2.4':
    'Le service fonctionne-t-il sur d’anciens systèmes et navigateurs ?',
  'rgesn.2.5':
    'L’affichage s’adapte-t-il au téléphone, à la tablette et à l’ordinateur ?',
  'rgesn.2.6': 'La conception et le code visent-ils à réduire les impacts ?',
  'rgesn.2.7': 'Avez-vous prévu la maintenance et l’arrêt du service ?',
  'rgesn.2.8': 'Vos fournisseurs s’engagent-ils à réduire leurs impacts ?',
  'rgesn.2.9':
    'Avez-vous pesé l’impact des composants d’interface prêts à l’emploi ?',
  'rgesn.2.10':
    'Avez-vous pesé l’impact des services tiers avant de les choisir ?',
  'rgesn.3.1':
    'L’architecture est-elle conçue pour limiter ses propres impacts ?',
  'rgesn.3.2': 'Les ressources s’adaptent-elles à l’usage réel du service ?',
  'rgesn.3.3': 'Le service peut-il suivre l’évolution des protocoles ?',
  'rgesn.3.4':
    'Les corrections sont-elles fournies pendant toute la durée prévue ?',
  'rgesn.3.5':
    'Peut-on installer une correction sans une évolution du produit ?',
  'rgesn.3.6': 'Les mises à jour n’envoient-elles que ce qui a changé ?',
  'rgesn.3.7':
    'Les environnements de test sont-ils utilisés seulement si besoin ?',
  'rgesn.4.1': 'Les vidéos, sons et animations restent-ils arrêtés au départ ?',
  'rgesn.4.2': 'Le service évite-t-il le défilement de contenu sans fin ?',
  'rgesn.4.3': 'Chaque parcours principal est-il court et direct ?',
  'rgesn.4.4': 'La personne peut-elle choisir d’activer un service tiers ?',
  'rgesn.4.5':
    'Utilisez-vous surtout les composants déjà fournis par la plateforme ?',
  'rgesn.4.6': 'Vidéos, sons et animations portent-ils une information utile ?',
  'rgesn.4.7': 'Choisissez-vous le média le plus léger qui répond au besoin ?',
  'rgesn.4.8': 'Le nombre de polices téléchargées est-il limité ?',
  'rgesn.4.9': 'La saisie évite-t-elle des requêtes serveur à chaque frappe ?',
  'rgesn.4.10':
    'Le format attendu est-il indiqué avant l’envoi du formulaire ?',
  'rgesn.4.11':
    'Le poids et le format des fichiers sont-ils annoncés avant l’envoi ?',
  'rgesn.4.12': 'Prévenez-vous quand une fonction a un impact important ?',
  'rgesn.4.13': 'Les notifications sont-elles rares et désactivables ?',
  'rgesn.4.14':
    'L’interface évite-t-elle les procédés qui poussent à l’usage ?',
  'rgesn.4.15':
    'La personne peut-elle suivre et réduire l’impact de son usage ?',
  'rgesn.5.1': 'Chaque image utilise-t-elle un format adapté à son contenu ?',
  'rgesn.5.2': 'La compression de chaque image est-elle adaptée à son usage ?',
  'rgesn.5.3': 'Chaque vidéo a-t-elle une définition adaptée à son affichage ?',
  'rgesn.5.4': 'La compression de chaque vidéo est-elle efficace ?',
  'rgesn.5.5': 'Les vidéos proposent-elles une écoute sans l’image ?',
  'rgesn.5.6': 'La compression audio est-elle adaptée à l’écoute ?',
  'rgesn.5.7': 'Chaque document utilise-t-il un format adapté à son usage ?',
  'rgesn.5.8': 'Les contenus périmés sont-ils archivés ou supprimés ?',
  'rgesn.6.1':
    'Un poids maximum et un nombre de requêtes sont-ils fixés par écran ?',
  'rgesn.6.2':
    'Les contenus que vous contrôlez sont-ils mis en cache côté visiteur ?',
  'rgesn.6.3': 'Les textes que vous contrôlez sont-ils compressés à l’envoi ?',
  'rgesn.6.4': 'Les images ont-elles des dimensions proches de l’affichage ?',
  'rgesn.6.5': 'Évitez-vous de charger des ressources non utilisées ?',
  'rgesn.6.6':
    'Les capteurs du terminal ne sont-ils activés que si nécessaire ?',
  'rgesn.6.7': 'Vos fichiers statiques partent-ils d’un seul nom de domaine ?',
  'rgesn.7.1':
    'Un cache serveur existe-t-il pour les données les plus demandées ?',
  'rgesn.7.2':
    'Les données ont-elles une durée de conservation, puis une suppression ?',
  'rgesn.7.3':
    'Un traitement en cours est-il signalé, pour éviter un double envoi ?',
  'rgesn.7.4':
    'Si une chaîne de blocs est utilisée, son consensus est-il sobre ?',
  'rgesn.8.1':
    'L’hébergeur a-t-il une démarche publiée de réduction d’impact ?',
  'rgesn.8.2':
    'L’hébergeur a-t-il une politique durable pour ses équipements ?',
  'rgesn.8.3': 'Le PUE de l’hébergement est-il publié et bas ?',
  'rgesn.8.4':
    'La consommation d’eau de l’hébergement est-elle suivie et limitée ?',
  'rgesn.8.5':
    'L’électricité de l’hébergement est-elle documentée et surtout renouvelable ?',
  'rgesn.8.6':
    'L’hébergement est-il situé là où l’électricité est peu carbonée ?',
  'rgesn.8.7': 'La chaleur des serveurs est-elle récupérée ou bien maîtrisée ?',
  'rgesn.8.8': 'Les données peu lues sont-elles séparées des données actives ?',
  'rgesn.8.9': 'Les copies de données sont-elles limitées au strict besoin ?',
  'rgesn.8.10':
    'Les traitements différés évitent-ils les pics de consommation ?',
  'rgesn.9.1':
    'L’entraînement d’un modèle est-il vraiment nécessaire au service ?',
  'rgesn.9.2':
    'La phase d’apprentissage est-elle proportionnée à l’usage réel ?',
  'rgesn.9.3': 'Avez-vous limité la quantité d’entraînement nécessaire ?',
  'rgesn.9.4':
    'Les données d’apprentissage sont-elles réduites au strict besoin ?',
  'rgesn.9.5': 'Les réentraînements sont-ils espacés selon le besoin réel ?',
  'rgesn.9.6': 'Les modèles d’entraînement sont-ils compressés ?',
  'rgesn.9.7':
    'L’inférence est-elle réglée pour limiter les ressources utilisées ?',
  'vie_privee.untested_runner':
    'Non testé : le navigateur d’audit n’a pas tourné.',
  'vie_privee.traceurs.untested':
    'Traceurs avant un choix : non testé. Le navigateur d’audit n’a pas tourné.',
  'vie_privee.cmp.untested':
    'Bannière de choix : non testé. Le navigateur d’audit n’a pas tourné.',
  'vie_privee.refus.untested':
    'Refus au premier niveau : non testé. Le navigateur d’audit n’a pas tourné.',
  'vie_privee.tiers.untested':
    'Scripts et polices d’un autre site : non testé. Le navigateur d’audit n’a pas tourné.',
  'vie_privee.untested_runner_invalid':
    'Non testé : le résultat du navigateur est inutilisable.',
  'vie_privee.untested_interaction':
    'Nous n’avons pas pu tester l’état d’avant le choix. Le navigateur a déjà cliqué.',
  'vie_privee.untested_home': 'Non testé : l’accueil n’a pas répondu.',
  'vie_privee.untested_home_status':
    'Non testé : l’accueil a répondu {status}.',
  'vie_privee.untested_not_html':
    'Non testé : l’accueil n’est pas une page HTML.',
  'vie_privee.untested_robots':
    'Non testé : le fichier robots bloque cette page.',
  'vie_privee.untested_robots_down':
    'Non testé : le fichier robots n’a pas répondu.',
  'vie_privee.untested_robots_status':
    'Non testé : le fichier robots a répondu {status}.',
  'vie_privee.untested_budget':
    'Non testé : le budget de requêtes est atteint.',
  'vie_privee.untested_down': 'Non testé : la page légale n’a pas répondu.',
  'vie_privee.untested_page_status':
    'Non testé : une page légale a répondu {status}.',
  'vie_privee.untested_page':
    'Non testé : la page légale n’est pas un texte lisible.',
  'vie_privee.traceurs.pass':
    'Aucun traceur connu n’est contacté avant un choix.',
  'vie_privee.traceurs.fail_one':
    'Un traceur connu est contacté avant un choix. Le visiteur n’a pas encore décidé.',
  'vie_privee.traceurs.fail_many':
    '{count} traceurs connus sont contactés avant un choix. Le visiteur n’a pas encore décidé.',
  'vie_privee.cmp.pass': 'Une bannière de choix est présente sur la page.',
  'vie_privee.cmp.pass_none':
    'Aucun traceur connu n’apparaît. Une bannière de choix n’est pas exigée.',
  'vie_privee.cmp.fail':
    'Des traceurs partent sans bannière de choix. Le visiteur ne peut pas décider.',
  'vie_privee.refus.pass':
    'Le refus est proposé au premier niveau, à côté de l’acceptation.',
  'vie_privee.refus.na':
    'Rien à refuser : aucun traceur connu, et pas de bannière.',
  'vie_privee.refus.fail':
    'Le refus n’est pas au premier niveau. Refuser demande plus d’étapes qu’accepter.',
  'vie_privee.refus.fail_absent':
    'Aucune bannière ne propose de tout refuser. Le visiteur ne peut pas s’opposer simplement.',
  'vie_privee.tiers.pass': 'Les scripts et les polices viennent de votre site.',
  'vie_privee.tiers.fail_scripts_one':
    'Un script vient d’un autre site. Il peut recevoir l’adresse du visiteur.',
  'vie_privee.tiers.fail_scripts_many':
    '{count} scripts viennent d’un autre site. Ils peuvent recevoir l’adresse du visiteur.',
  'vie_privee.tiers.warn_fonts_one':
    'Une police vient d’un autre site. Son chargement envoie l’adresse du visiteur.',
  'vie_privee.tiers.warn_fonts_many':
    '{count} polices viennent d’un autre site. Leur chargement envoie l’adresse du visiteur.',
  'vie_privee.mentions.pass':
    'La page des mentions légales est présente et contient du texte.',
  'vie_privee.mentions.fail_missing':
    'La page des mentions légales est introuvable depuis l’accueil.',
  'vie_privee.mentions.fail_empty':
    'La page des mentions légales ne contient pas de texte lisible.',
  'vie_privee.confidentialite.pass':
    'La page de confidentialité est présente et contient du texte.',
  'vie_privee.confidentialite.fail_missing':
    'La page de confidentialité est introuvable depuis l’accueil.',
  'vie_privee.confidentialite.fail_empty':
    'La page de confidentialité ne contient pas de texte lisible.',
  'vie_privee.elements.pass':
    'Les pages légales indiquent l’éditeur, l’hébergeur et un contact.',
  'vie_privee.elements.warn': 'Il manque {missing} sur les pages légales.',
  'vie_privee.elements.fail':
    'Les pages légales n’indiquent ni l’éditeur, ni l’hébergeur, ni un contact.',
  'legal.email': 'Audixio@outlook.fr',
  'legal.site': 'https://audigyweb.fr',
  'legal.review':
    'Le propriétaire doit encore relire ce texte avant l’ouverture.',
  'meta.terms.title': 'Conditions d’utilisation — Audixio',
  'meta.terms.description':
    'Conditions d’utilisation d’Audixio, dont le mandat pour les tests actifs.',
  'meta.privacy.title': 'Confidentialité — Audixio',
  'meta.privacy.description':
    'Quelles données Audixio garde, pourquoi, et comment les effacer.',
  'meta.mentions.title': 'Mentions légales — Audixio',
  'meta.mentions.description': 'Éditeur, contact et hébergeur du site Audixio.',
  'meta.a11y.title': 'Accessibilité — Audixio',
  'meta.a11y.description':
    'Objectif d’accessibilité d’Audixio et état de l’audit.',
  'meta.method.title': 'Méthode — Audixio',
  'meta.method.description':
    'Comment Audixio calcule ses notes, version par version.',
  'meta.account.title': 'Compte — Audixio',
  'meta.account.description':
    'Accepter les conditions, exporter ou supprimer le compte.',
  'terms.title': 'Conditions d’utilisation',
  'terms.version.label': 'Version {version}.',
  'terms.date': 'Texte du 24 oct. 2026.',
  'terms.free.title': 'Service gratuit',
  'terms.free.body':
    'Audixio est gratuit. Il aide à comprendre l’état d’un site.',
  'terms.free.limit': 'Le service peut changer, ou s’arrêter, sans préavis.',
  'terms.owner.title': 'Propriété et mandat',
  'terms.owner.declare':
    'Vous déclarez être propriétaire du site, ou mandaté par écrit.',
  'terms.owner.active': 'Cette déclaration vaut avant tout test actif.',
  'terms.owner.law':
    'Un test actif sans autorisation peut être une infraction.',
  'terms.owner.article': 'Le texte visé est l’article 323-1 du code pénal.',
  'terms.owner.passive':
    'Un test passif se limite à ce qu’un visiteur peut voir.',
  'terms.proof.title': 'Rapports',
  'terms.proof.bailiff':
    'Ce rapport n’est pas un constat de commissaire de justice.',
  'terms.proof.value': 'Il n’en a pas la valeur.',
  'terms.proof.date':
    'Il décrit ce que les robots ont observé, à la date indiquée.',
  'terms.proof.eidas':
    'L’horodatage RFC 3161 est non qualifié au sens d’eIDAS.',
  'terms.proof.article':
    'L’article 41.1 d’eIDAS admet cet horodatage comme preuve.',
  'terms.proof.presumption':
    'L’article 41.2 n’en fait pas une présomption d’exactitude.',
  'terms.accept.title': 'Acceptation',
  'terms.accept.body': 'La version acceptée est enregistrée avec la date.',
  'terms.accept.new': 'Une nouvelle version demande une nouvelle acceptation.',
  'terms.account.title': 'Compte',
  'terms.account.export': 'Vous pouvez exporter vos données en JSON.',
  'terms.account.delete':
    'Vous pouvez supprimer le compte, données et fichiers compris.',
  'terms.law.title': 'Droit applicable',
  'terms.law.body': 'Les conditions sont soumises au droit français.',
  'privacy.title': 'Politique de confidentialité',
  'privacy.who.title': 'Qui est responsable',
  'privacy.who.body': 'Audixio est édité par un particulier non professionnel.',
  'privacy.who.contact': 'Pour une question sur vos données, écrivez à',
  'privacy.what.title': 'Quelles données',
  'privacy.what.account':
    'Le compte garde votre courriel et la date d’acceptation des conditions.',
  'privacy.what.sites':
    'Les sites, les audits, les notes et les fichiers de preuve sont enregistrés.',
  'privacy.what.google':
    'Un jeton Search Console, s’il existe, est chiffré. Il n’est pas exporté.',
  'privacy.what.logs': 'Un journal technique garde les actions du compte.',
  'privacy.why.title': 'Pourquoi',
  'privacy.why.body':
    'Ces données servent à auditer vos sites et à vous prévenir.',
  'privacy.why.basis':
    'La base est l’exécution des conditions, ou l’intérêt légitime pour la sécurité.',
  'privacy.how.title': 'Où elles vont',
  'privacy.how.eu':
    'Elles sont stockées dans l’Union européenne, chez Supabase Pte. Ltd.',
  'privacy.how.us':
    'Les fonctions du site tournent aux États-Unis, dans l’Ohio, chez Netlify.',
  'privacy.how.mail': 'Les e-mails partent par Brevo, en France.',
  'privacy.how.google':
    'Google intervient pour la vitesse, l’indexation ou les avis, si vous les activez.',
  'privacy.how.github':
    'Le navigateur d’audit, quand il tourne, passe par GitHub Actions.',
  'privacy.how.none': 'Aucun traceur tiers n’est déposé. Aucune publicité.',
  'privacy.cookies':
    'La session de connexion est le seul stockage. Pas de bannière.',
  'privacy.keep.title': 'Combien de temps',
  'privacy.keep.results': 'Les résultats restent tant que le compte existe.',
  'privacy.keep.files': 'Les captures et les PDF sont gardés douze mois.',
  'privacy.keep.warc':
    'Un fichier WARC n’existe que sur demande, pendant douze mois.',
  'privacy.keep.account':
    'La suppression du compte efface les données et les fichiers.',
  'privacy.rights.title': 'Vos droits',
  'privacy.rights.export':
    'Vous pouvez télécharger un fichier JSON depuis votre compte.',
  'privacy.rights.delete':
    'Vous pouvez supprimer le compte, et donc les données.',
  'privacy.rights.mail': 'Pour rectifier une donnée, écrivez à',
  'privacy.rights.cnil':
    'Vous pouvez saisir la CNIL si une réponse ne vous convient pas.',
  'privacy.share': 'Les données ne sont pas vendues.',
  'mentions.title': 'Mentions légales',
  'mentions.editor.title': 'Éditeur',
  'mentions.editor.body':
    'Le site est édité par Audixio, un particulier non professionnel.',
  'mentions.editor.anon':
    'Son identité est communiquée à l’hébergeur, et non publiée ici.',
  'mentions.editor.law':
    'C’est le régime prévu pour une personne qui n’agit pas à titre professionnel.',
  'mentions.director':
    'La direction de la publication revient à ce même particulier.',
  'mentions.contact.title': 'Contact',
  'mentions.contact.body': 'Écrivez à',
  'mentions.site': 'Le site visé est {site}.',
  'mentions.host.title': 'Hébergeur',
  'mentions.host.body': 'L’hébergeur du site est Netlify, Inc.',
  'mentions.host.address':
    '101 2nd Street, San Francisco, CA 94105, États-Unis.',
  'mentions.host.mail': 'Courriel de l’hébergeur : support@netlify.com.',
  'mentions.host.phone': 'L’hébergeur ne publie pas de numéro de téléphone.',
  'mentions.data':
    'Les données du compte sont stockées dans l’Union européenne, chez Supabase Pte. Ltd.',
  'a11y.title': 'Déclaration d’accessibilité',
  'a11y.state': 'État au 24 oct. 2026 : audit formel non réalisé.',
  'a11y.goal': 'L’objectif est le niveau AA du RGAA 4.1.',
  'a11y.wcag': 'Cela correspond aux WCAG 2.2, niveau AA.',
  'a11y.honest':
    'Cette page ne déclare pas la conformité. L’audit reste à faire.',
  'a11y.contact': 'Signalez un blocage à',
  'a11y.tech': 'Les pages sont en HTML, en français, sans script tiers.',
  'a11y.limits':
    'La jauge annonce sa note. Le passage au lecteur d’écran se fait à la main.',
  'method.lead': 'Cette page explique comment Audixio calcule ses notes.',
  'method.version': 'Méthode 2026.1',
  'method.change':
    'Toute modification de pondération crée une nouvelle version.',
  'method.recorded': 'La version est enregistrée sur chaque audit.',
  'method.status.title': 'Résultat d’un test',
  'method.status.body': 'Chaque test donne un statut.',
  'method.pass': 'Réussi : le point est conforme. Valeur 1.',
  'method.warn': 'À améliorer : le point est partiel. Valeur 0,5.',
  'method.fail': 'Problème : le point n’est pas conforme. Valeur 0.',
  'method.untested':
    'Non testé : le test est impossible, avec la raison. Il est exclu.',
  'method.na': 'Non applicable : le test est sans objet. Il est exclu.',
  'method.partial': 'Un test peut donner une valeur entre 0 et 1.',
  'method.weight': 'Chaque test pèse 1, 2 ou 3 dans son domaine.',
  'method.lighthouse': 'Le score Lighthouse d’un domaine pèse 3.',
  'method.skip.title': 'Quand un test devient non testé',
  'method.skip.lead': 'Le test n’est pas compté, et la raison est affichée.',
  'method.skip.active':
    'Un test actif n’est jamais lancé sans propriété revérifiée.',
  'method.skip.source': 'La source peut manquer : clé, quota ou navigateur.',
  'method.skip.timeout': 'Un délai dépassé rend le test non testé.',
  'method.skip.error': 'Une erreur pendant le test a le même effet.',
  'method.passive': 'Un test passif fait ce qu’un visiteur ferait.',
  'method.active': 'Un test actif exige un site vérifié.',
  'method.penal': 'Sans mandat, un test actif peut être une infraction.',
  'method.penal.link': 'Voir les conditions d’utilisation.',
  'method.domain.title': 'Score d’un domaine',
  'method.domain.formula':
    'Le score arrondit 100 fois les points obtenus, divisés par les points possibles.',
  'method.coverage': 'La couverture compare le poids noté au poids applicable.',
  'method.coverage.low': 'Sous 50 % de couverture, le domaine reste non testé.',
  'method.coverage.why': 'Une note sur trop peu de tests serait trompeuse.',
  'method.global.title': 'Score global',
  'method.global.body':
    'Le score global est la moyenne des domaines notés, à poids égaux.',
  'method.global.eight':
    'Huit domaines principaux comptent, avec le même poids.',
  'method.global.aside': 'Réputation et disponibilité sont affichées à part.',
  'method.global.empty': 'Sans domaine noté, le score global est non testé.',
  'method.level.title': 'Niveaux',
  'method.level.good': 'De 80 à 100 : bon.',
  'method.level.improve': 'De 50 à 79 : à améliorer.',
  'method.level.problem': 'De 0 à 49 : problème.',
  'method.level.none': 'Sans chiffre : non testé.',
  'method.order.title': 'Ordre des corrections',
  'method.order.body':
    'Les problèmes viennent d’abord, puis les points à améliorer.',
  'method.order.tie': 'À égalité, l’ordre suit l’identifiant du test.',
  'method.repro.title': 'Reproductibilité',
  'method.repro.body': 'Les mêmes réponses donnent le même rapport.',
  'method.proof':
    'Le rapport décrit une observation. Ce n’est pas un constat de commissaire de justice.',
  'method.proof.link':
    'Les mentions de preuve sont sur la page de vérification.',
  'method.never.title': 'Ce que nous ne faisons jamais',
  'method.never.lead':
    'Par respect pour vos serveurs et la législation (art. 323-1 du Code pénal), nos vérifications sont strictement encadrées :',
  'method.never.exploit':
    'Aucune tentative d’intrusion ni exploitation de faille technique.',
  'method.never.bruteforce':
    'Aucun test destructeur, charge massive ou force brute.',
  'method.never.submit':
    'Aucun envoi de données dans vos formulaires ou paniers.',
  'method.never.sell':
    'Aucune revente de vos rapports, e-mails ou données d’audit.',
  'method.self.title': 'Transparence et auto-audit',
  'method.self.lead':
    'Audixio s’applique à lui-même l’ensemble des standards mesurés :',
  'method.self.csp':
    'En-têtes de sécurité stricts (politique de contenu, HSTS).',
  'method.self.privacy':
    'Zéro traceur commercial, zéro cookie tiers avant consentement.',
  'method.self.a11y':
    'Accessibilité conforme (Atkinson Hyperlegible, contrastes élevés).',
  'account.title': 'Votre compte',
  'account.lead': 'Gérez l’export de vos données et la suppression du compte.',
  'domain.cause.coverage':
    'Moins de la moitié des tests ont abouti. Ce domaine n’a pas de note.',
  'domain.cause.closing': 'Ce n’est pas une note du site.',
  'domain.cause.others': 'Autres raisons',
  'domain.cause.browser': 'Le navigateur d’audit n’a pas tourné.',
  'domain.cause.pending': 'Le navigateur d’audit n’a pas encore fini.',
  'domain.cause.psi': 'PageSpeed n’a pas renvoyé de mesure.',
  'domain.cause.crux': 'Il n’y a pas de mesure de visite réelle.',
  'domain.cause.gsc': 'Search Console n’est pas reliée.',
  'domain.cause.dns': 'Le DNS public n’a pas répondu.',
  'domain.cause.external': 'Une source extérieure n’a pas répondu.',
  'domain.cause.gsc.link': 'Relier Search Console',
  'account.out': 'Connectez-vous pour gérer votre compte.',
  'account.login': 'Aller à la connexion',
  'account.checklist': 'Checklist de démarrage',
  'account.terms.ok': 'Conditions version {version} : acceptées.',
  'account.terms.missing':
    'Conditions version {version} : pas encore acceptées.',
  'account.terms.check': 'J’accepte les conditions de cette version.',
  'account.terms.action': 'Enregistrer l’acceptation',
  'account.terms.link': 'Lire les conditions',
  'account.terms.required': 'Cochez la case pour accepter cette version.',
  'account.terms.done': 'L’acceptation est enregistrée.',
  'account.export.action': 'Télécharger mes données',
  'account.export.done': 'Le fichier est prêt.',
  'account.export.hint':
    'Le fichier contient vos sites, vos rapports et l’historique.',
  'account.terms.when': 'Acceptées le {date}, version {version}.',
  'account.delete.open': 'Supprimer mon compte',
  'account.delete.confirm':
    'Cette action efface vos sites, vos rapports et vos fichiers. Elle est définitive.',
  'account.delete.cancel': 'Annuler',
  'account.delete.forever': 'Supprimer définitivement',
  'account.delete.done': 'Le compte est supprimé.',
  'account.error': 'L’action n’a pas abouti. Réessayez.',
  'priorities.title': '3 priorités d’action',
  'priorities.subtitle':
    'Ce qui a le plus d’impact sur votre note et qui est rapide à corriger',
  'priorities.duration': 'Durée estimée : {minutes} min',
  'priorities.difficulty.easy': 'Facile',
  'priorities.difficulty.medium': 'Moyen',
  'priorities.difficulty.hard': 'Avancé',
  'priorities.actor.owner': 'Par vous-même',
  'priorities.actor.developer': 'Par votre développeur',
  'priorities.actor.sysadmin': 'Hébergeur ou administrateur',
  'priorities.btn.fix': 'Comment corriger',
  'priorities.btn.brief': '+ Ajouter au brief',
  'priorities.guide.modal.title': 'Guide de correction rapide',
  'priorities.guide.modal.close': 'Fermer le guide',
  'priorities.guide.host.label': 'Votre hébergeur ou registrar :',
  'priorities.guide.step': 'Étape {step}',
  'priorities.guide.host.netlify': 'Netlify',
  'priorities.guide.host.github_pages': 'GitHub Pages',
  'priorities.guide.host.other': 'Autre hébergeur',
  'priorities.added': 'Ajouté au brief',
  'priorities.guide.copy': 'Copier le code',
  'priorities.guide.copied': 'Copié !',
  'priorities.guide.verify_after': 'Vérifier après modification',
  'priorities.guide.recheck_hint':
    'Après avoir enregistré vos réglages, relancez une vérification pour constater le gain.',
  'priorities.bridge.title': 'Corriger avec un assistant IA',
  'priorities.bridge.desc':
    'Exportez un brief complet et prêt à coller dans Cursor, Copilot ou Claude pour corriger automatiquement les constats sélectionnés.',
  'priorities.bridge.action': 'Ouvrir la sélection du brief',
  'priorities.why.dmarc':
    "Protège votre nom de domaine contre l'usurpation d'identité et garantit la délivrabilité de vos e-mails.",
  'priorities.why.spf':
    "Déclare officiellement quels serveurs ont le droit d'envoyer des e-mails avec votre nom de domaine.",
  'priorities.why.dkim':
    "Signe cryptographiquement vos courriels pour éviter qu'ils n'atterrissent dans les courriers indésirables.",
  'priorities.why.hsts':
    'Force les navigateurs à utiliser une connexion chiffrée HTTPS et bloque les interceptions.',
  'priorities.why.https':
    "Garantit la confidentialité et l'intégrité des données échangées avec vos visiteurs.",
  'priorities.why.xcto':
    'Interdit aux navigateurs de deviner le type de fichier, bloquant les attaques par contenu piégé.',
  'priorities.why.frames':
    "Empêche l'intégration de vos pages dans des fenêtres invisibles piégées (clickjacking).",
  'priorities.why.csp':
    "Restreint les sources de scripts autorisées et bloque l'injection de code malveillant.",
  'priorities.why.images_poids':
    "Des images trop lourdes ralentissent considérablement l'affichage, surtout sur mobile.",
  'priorities.why.images_dimensions':
    'Spécifier la largeur et la hauteur évite les sursauts de page agaçants lors du chargement.',
  'priorities.why.accessibilite':
    "Permet aux utilisateurs malvoyants ou naviguant au clavier d'utiliser votre site sans blocage.",
  'priorities.why.seo_title':
    'Le titre de page est le premier critère pris en compte par les moteurs de recherche.',
  'priorities.why.seo_description':
    'La description incite les internautes à cliquer sur votre lien dans les résultats Google.',
  'priorities.why.traceurs':
    'Le dépôt de cookies avant consentement enfreint la réglementation RGPD et la directive ePrivacy.',
  'priorities.why.compression':
    "Activer la compression Gzip ou Brotli allège les transferts et diminue l'impact environnemental.",
  'priorities.why.default':
    'Cette amélioration renforce la fiabilité, la rapidité et la conformité de votre site.',
  'report.grade.letter': 'Note {grade}',
  'report.grade.label': '{label} ({score}/100)',
  'nav.home': 'Accueil',
  'nav.pricing': 'Tarifs',
  'nav.backtop': 'Remonter en haut',
  'nav.bottom': 'Navigation principale',
  'nav.pages': 'Pages',
  'footer.version': 'V3.4',
  'footer.about':
    'Observatoire indépendant de l’hygiène web. Aucune donnée commerciale stockée.',
  'footer.pro': 'Audixio Pro',
  'footer.passive': 'Passif par défaut',
  'footer.rights': '© 2026 Audixio',
  'hub.audit': 'Audit de {host}',
  'hub.verified': 'Propriété vérifiée',
  'hub.note': 'Note globale',
  'hub.note.missing': 'La note globale s’ouvre après la preuve de propriété.',
  'hub.priorities': 'Priorités',
  'hub.domains': 'Les 8 domaines',
  'hub.domains.hint': 'Cliquez un domaine pour voir le détail',
  'hub.brief.title': 'Brief pour votre assistant IA',
  'hub.brief.lead':
    'Préparez un prompt complet et sur mesure à coller directement dans votre outil d’IA habituel.',
  'hub.brief.cta': 'Ouvrir le brief IA',
  'hub.share': 'Partager',
  'hub.badge': 'Badge de note',
  'hub.sev.crit': 'Critique · urgent',
  'hub.sev.fix': 'À corriger',
  'hub.sev.check': 'À vérifier',
  'hub.sev.minor': 'Mineur',
  'hub.failed.title': 'L’audit n’a pas abouti',
  'hub.failed.body': 'Le site n’a pas répondu assez pour établir une note.',
  'hub.failed.denied': 'Le site a refusé la lecture. Rien n’a été forcé.',
  'hub.failed.down': 'Le site était injoignable au moment de la mesure.',
  'hub.lock.https': 'Certificat du site',
  'hub.lock.hsts': 'Maintien du chiffrement',
  'hub.lock.frame': 'Protection contre l’intégration',
  'hub.lock.lead':
    'Le détail de ce domaine reste masqué tant que la propriété n’est pas prouvée.',
  'hub.lock.why':
    'On indique ce qui est regardé, pas le résultat de chaque test.',
  'hub.detail': 'Voir le détail',
  'hub.plan': 'Plan d’action',
  'hub.plan.title': 'Plan d’action',
  'hub.plan.lead':
    'Les constats à traiter, avec un statut enregistré sur votre compte.',
  'plan.todo': 'À faire',
  'plan.doing': 'En cours',
  'plan.done': 'Fait',
  'plan.status': 'Statut',
  'plan.progress': '{done} sur {total}',
  'share.title': 'Partager le rapport',
  'share.lead':
    'Toute personne disposant du lien peut consulter le rapport de {host}, sans compte.',
  'share.copy': 'Copier le lien',
  'share.copied': 'Lien copié',
  'share.native': 'Partager via…',
  'share.close': 'Fermer',
  'share.badge': 'Intégrer le badge Audixio',
  'share.badge.hint': 'Affichez votre note sur votre site.',
  'share.create': 'Créer le lien',
  'share.notyet': 'Le lien public n’est pas encore créé.',
  'share.error': 'Le lien n’a pas pu être créé.',
  'badge.title': 'Afficher votre note sur votre site',
  'badge.lead':
    'Un badge qui renvoie vers le rapport public. Il se met à jour tout seul après chaque ré-audit.',
  'badge.copy': 'Copier le code',
  'badge.copied': 'Code copié.',
  'badge.back': 'Retour au rapport',
  'badge.heading': 'Badge de note',
  'badge.pick':
    'Choisissez un site ou un rapport pour afficher son badge de note.',
  'domain.nav': 'Domaines du rapport',
  'domain.back': 'Retour au rapport',
  'pro.later':
    'Audixio Pro arrive plus tard. Le rapport et le brief restent gratuits.',
  'brand.ui': 'Audixio',
  'hub.a11y': 'Mesure automatique, partielle.',
  'verify.of': 'Vérifier la propriété de {host}',
  'skip.main': 'Aller au contenu principal',
  'footer.home': 'Audixio — accueil',
  'footer.legal.links': 'Liens légaux',
  'footer.cgu': 'CGU',
  'footer.eco': 'Écoconception',
  'footer.robot': 'Robot Audixio',
  'footer.cookies': 'Cookies',
  'footer.bottom':
    '© 2026 Audixio · Passif par défaut · Outil gratuit · Aucun traceur tiers · Polices auto-hébergées',
  'nav.open': 'Ouvrir le menu',
  'nav.mobile': 'Navigation principale (mobile)',
  'locale.en.short': 'EN — English',
  'locale.fr.short': 'FR — Français',
  'theme.dark.later': 'Mode sombre : bientôt disponible',
  'domain.performance.short': 'Performance',
  'domain.seo.short': 'SEO',
  'domain.securite.short': 'Sécurité',
  'domain.ecologie.short': 'Écologie',
  'domain.accessibilite.short': 'Accessibilité',
  'domain.qualite.short': 'Qualité technique',
  'domain.vie_privee.short': 'Vie privée',
  'domain.dns_email.short': 'DNS / e-mail',
  'domain.performance.pager': 'Performance',
  'domain.seo.pager': 'SEO & indexabilité',
  'domain.securite.pager': 'Sécurité',
  'domain.ecologie.pager': 'Écologie & Empreinte',
  'domain.accessibilite.pager': 'Accessibilité',
  'domain.qualite.pager': 'Qualité du code',
  'domain.vie_privee.pager': 'Vie privée',
  'domain.dns_email.pager': 'Infrastructure & e-mail',
  'hub.crumbs': 'Fil d’Ariane',
  'hub.audit.lead': 'Audit de',
  'hub.verified.title': 'Vous avez prouvé que ce site vous appartient',
  'hub.date': 'Audité le',
  'hub.pdf': 'Exporter en PDF',
  'hub.rerun': 'Relancer',
  'hub.pin.label': 'Priorité {n} : {title}',
  'hub.mock.cap':
    '{n} repères sur votre page d’accueil · survolez-les pour voir le détail',
  'hub.sum.performance': 'Le site met un peu trop de temps à s’afficher.',
  'hub.sum.seo': 'Les bases sont là, avec quelques trous.',
  'hub.sum.securite': 'Des protections visibles peuvent être renforcées.',
  'hub.sum.ecologie': 'Le poids des pages peut être réduit.',
  'hub.sum.accessibilite': 'Contrastes et textes d’images à revoir.',
  'hub.sum.qualite': 'Quelques erreurs faciles à corriger.',
  'hub.sum.vie_privee': 'Ce domaine n’est pas encore analysé.',
  'hub.sum.dns_email': 'La configuration publique est correcte.',
  'domaine.overview': 'Vue d’ensemble du rapport',
  'domaine.tag': 'Domaine · {name}',
  'domaine.owned': 'Propriété vérifiée · {host}',
  'domaine.q': 'Un diagnostic clair, sans acronymes obscurs.',
  'domaine.performance.title':
    'Votre site est ralenti ? Voici exactement pourquoi.',
  'domaine.see': 'Voir les {n} constats',
  'domaine.prepare': 'Préparer un prompt IA',
  'domaine.constats': 'Constats et actions recommandées',
  'domaine.constats.eyebrow':
    'Diagnostics détaillés · {n} éléments passés au crible',
  'domaine.filter': 'Filtrer les constats',
  'domaine.filter.all': 'Tous',
  'domaine.filter.crit': 'Critiques',
  'domaine.filter.mod': 'Modérés',
  'domaine.filter.ok': 'Conformes',
  'domaine.sort': 'Trier',
  'domaine.sort.desc': 'Du plus au moins critique',
  'domaine.sort.asc': 'Du moins au plus critique',
  'domaine.empty': 'Aucun constat dans cette catégorie.',
  'domaine.nothing': 'Rien à signaler dans ce domaine.',
  'domaine.details': 'Détails',
  'domaine.fix.link': 'Corriger',
  'domaine.soon': 'Fiche détaillée à venir',
  'domaine.choice': 'Instruction pour le prompt IA : {title}',
  'domaine.none': 'Rien',
  'domaine.check': 'À vérifier',
  'domaine.correct': 'À corriger',
  'domaine.actions': 'Actions recommandées',
  'domaine.observe': 'Observation',
  'domaine.prompt.title': 'Sélection pour le prompt IA',
  'domaine.prompt.sum':
    '{n} constats configurés · {fix} à corriger · {chk} à vérifier',
  'domaine.prompt.hint':
    'Pour chaque constat, choisissez : Rien (ignorer), À vérifier (analyser) ou À corriger (générer le code correctif).',
  'domaine.prompt.gen': 'Générer et copier le prompt',
  'domaine.prompt.done': 'Prompt copié',
  'domaine.prompt.local':
    'Le prompt est construit dans votre navigateur à partir de vos choix.',
  'domaine.export.eyebrow': 'Export et transmission',
  'domaine.export.title':
    'Transmettre ces conclusions ou missionner un développeur',
  'domaine.export.lead':
    'Partagez une synthèse claire au format de votre choix : un brief prêt à l’emploi pour votre équipe ou votre agence.',
  'domaine.export.copy': 'Copier le brief dev',
  'domaine.export.mail': 'Envoyer par e-mail',
  'domaine.export.file': 'Exporter le rapport',
  'domaine.prev': 'Domaine précédent',
  'domaine.next': 'Domaine suivant',
  'domaine.hub': 'Vue d’ensemble',
  'domaine.ladder': 'Progression possible de la note',
  'domaine.slow': 'Lente',
  'domaine.fast': 'Rapide',
  'domaine.low': 'Faible',
  'domaine.good': 'Bonne',
  'domaine.now': 'Actuelle',
  'domaine.mid': 'Modérée',
  'domaine.goal': 'Objectif',
  'domaine.grade.note': 'Note {grade} : ',
  'domaine.lede.speed':
    'Aujourd’hui, la fluidité globale est modérée : un visiteur patiente près de 3 secondes avant de pouvoir utiliser confortablement vos contenus. Trois corrections simples suffisent pour viser la note A.',
  'domaine.card.speed': 'Vitesse modérée',
  'domaine.card.speed.sub': 'Potentiel d’accélération élevé',
  'domaine.gain.lead': 'de fluidité ressentie, gain estimé au maximum',
  'domaine.gain.opt': '{n} optimisations',
  'domaine.gain.goal': 'pour atteindre la note A',
  'domaine.impact.s': 'Impact ≈ {n} s',
  'domaine.impact.ok': 'Optimal',
  'domaine.lock.title': 'Créez un compte pour débloquer ces outils',
  'domaine.lock.1': 'Copie intégrale du brief dev et IA',
  'domaine.lock.2': 'Envoi par e-mail en 1 clic',
  'domaine.lock.3': 'Export du rapport PDF complet',
  'domaine.lock.4': 'Suivi et validation des correctifs',
  'domaine.lock.cta': 'Créer un compte gratuitement',
  'domaine.lock.sr': '(verrouillé)',
  'restreint.notice': 'Domaine restreint · Détail réservé au propriétaire',
  'restreint.limited': 'Accès limité',
  'restreint.lead':
    'Pour protéger le site, les constats détaillés de ce domaine sont masqués au public et réservés au propriétaire. Audixio affiche ce qui est testé, jamais le détail des faiblesses.',
  'restreint.sub':
    'Les points de contrôle sont visibles par tous ; le résultat détaillé de chaque test, lui, n’est montré qu’au propriétaire vérifié du domaine.',
  'restreint.unverified': 'Site non vérifié · {host}',
  'restreint.cta': 'Vérifier la propriété pour débloquer',
  'restreint.back': 'Retour au rapport',
  'restreint.why': 'Comprendre pourquoi c’est masqué',
  'restreint.why.1':
    'Audixio suit une démarche de divulgation responsable : on montre publiquement ce qui est testé, jamais le détail des faiblesses. Publier la liste précise des réglages manquants pourrait aider une personne malveillante à cibler le site.',
  'restreint.why.2':
    'Une fois la propriété vérifiée, vous accédez aux constats détaillés, à la note complète et aux actions correctives, ainsi qu’aux autres informations restreintes du rapport.',
  'restreint.doc': 'Constats réservés',
  'restreint.stamp': 'Réservé au propriétaire',
  'restreint.checks': 'Ce qui a été analysé (aperçu)',
  'restreint.count': 'vérifications prêtes',
  'restreint.wait': 'En attente de vérification',
  'restreint.point': 'Contrôle',
  'restreint.chip.1': 'HTTPS',
  'restreint.chip.2': 'En-têtes',
  'restreint.chip.3': 'Accès',
  'restreint.ready': 'Prêt à consulter',
  'restreint.step.1': 'Choisir la méthode',
  'restreint.step.1b':
    'Google Search Console (recommandé si le site y figure déjà), enregistrement DNS TXT, balise méta ou fichier sur le site.',
  'restreint.step.2': 'Vérification par Audixio',
  'restreint.step.2b':
    'Audixio vérifie lui-même la preuve sur votre site, votre DNS ou votre Search Console. En général quelques minutes ; le DNS peut demander plus de temps.',
  'restreint.step.3': 'Accès au détail',
  'restreint.step.3b':
    'Consultez les constats détaillés, la note complète (A à F) et les actions correctives recommandées.',
  'restreint.console': 'Preuve de propriété',
  'restreint.free': 'Gratuit',
  'restreint.unique': 'Jeton unique',
  'restreint.tab.gsc': 'Google Search Console',
  'restreint.tab.dns': 'DNS TXT',
  'restreint.tab.meta': 'Balise méta',
  'restreint.tab.file': 'Fichier HTML',
  'restreint.tab.wk': 'Fichier .well-known',
  'restreint.rec': 'Recommandé',
  'restreint.how.gsc':
    'Connectez votre compte Google. Audixio vérifie en lecture seule que le domaine figure dans votre Search Console avec le rôle de propriétaire.',
  'restreint.how.dns':
    'Chez votre registrar, ajoutez un enregistrement TXT à la racine du domaine. La propagation peut prendre plus longtemps.',
  'restreint.how.meta':
    'Collez la balise dans l’en-tête de la page d’accueil. Elle n’apparaît pas aux visiteurs.',
  'restreint.how.file':
    'Créez ce fichier à la racine du site, accessible publiquement, avec le jeton pour seul contenu.',
  'restreint.how.wk':
    'Créez ce fichier texte dans le dossier .well-known du site, avec le jeton pour seul contenu.',
  'restreint.access': 'Accès',
  'restreint.access.v': 'Lecture seule',
  'restreint.role': 'Rôle requis',
  'restreint.role.v': 'Propriétaire',
  'restreint.google': 'Continuer avec Google',
  'restreint.verify.site': 'Vérifier la propriété du site',
  'restreint.guide': 'Consulter le guide pas à pas',
  'restreint.note.1': 'Ce que la vérification débloque',
  'restreint.note.1b':
    'Les constats détaillés, la note complète et les actions correctives, ainsi que les autres informations restreintes du rapport.',
  'restreint.note.2': 'Un jeton unique',
  'restreint.note.2b':
    'Le jeton est propre à votre compte et à ce domaine. Audixio le vérifie lui-même, et le revérifie avant tout test actif.',
  'restreint.note.3': 'Gardez la preuve en place',
  'restreint.note.3b':
    'Après la vérification, laissez l’enregistrement, la balise ou le fichier en place. Gratuit, sans modification visible du site.',
  'restreint.back.all': 'Retour au rapport d’audit complet',
  'restreint.how.label': 'Comment :',
  'restreint.where.label': 'Où :',
  'restreint.copy': 'Copier',
  'restreint.dns.type': 'Type',
  'restreint.dns.txt': 'TXT',
  'restreint.dns.host': 'Nom',
  'restreint.dns.at': '@',
  'restreint.meta.where': 'Emplacement',
  'restreint.meta.head': 'En-tête de la page d’accueil',
  'restreint.file.addr': 'Adresse',
  'restreint.token.slot': 'votre-jeton',
  'restreint.tested': 'Ce qui est testé, pas les failles',
  'restreint.reserved': 'Détail réservé',
  'restreint.check.1': 'Certificat du site',
  'restreint.check.1b':
    'Validité de la chaîne de confiance, algorithmes et dates de renouvellement.',
  'restreint.check.2': 'Protection du navigateur',
  'restreint.check.2b':
    'Directives qui limitent l’intégration de la page et les injections.',
  'restreint.check.3': 'Règles d’accès aux contenus',
  'restreint.check.3b':
    'Contrôle des politiques de restriction des ressources externes.',
  'restreint.unlock': 'Débloquer le rapport',
  'restreint.prove': 'Prouver que {host} vous appartient',
  'restreint.prove.lead':
    'Gratuit, et sans modification visible du site. Choisissez la méthode qui vous convient.',
  'restreint.scene':
    'Illustration : un bouclier verrouillé, sans détail des contrôles.',
  'preuve.h1': 'Vérifier la propriété de',
  'preuve.eyebrow': 'Propriété du domaine · jetons éphémères',
  'preuve.lede':
    'Audixio place un jeton unique, vous le publiez, Audixio le détecte. Une nouvelle vérification a lieu avant chaque test actif.',
  'preuve.choose': 'Choisir une méthode',
  'preuve.report': 'Voir le rapport',
  'preuve.why.kicker': 'Pourquoi prouver le contrôle du domaine ?',
  'preuve.why.title': 'Une preuve, quatre accès débloqués',
  'preuve.why.lead':
    'Prouver que votre compte contrôle le domaine débloque les fonctions sensibles. Le contrôle reste passif.',
  'preuve.token': 'Votre jeton',
  'preuve.copy.token': 'Copier le jeton',
  'preuve.crumb': 'Vérifier la propriété',
  'preuve.methods': 'Publiez votre jeton',
  'preuve.methods.kicker': 'Choisissez une méthode de vérification',
  'preuve.methods.lead':
    'Une seule méthode est active à la fois. Elles utilisent le même jeton.',
  'preuve.unlock.1': 'Le détail complet du rapport',
  'preuve.unlock.1b': 'Chaque constat, ses preuves et les fichiers concernés.',
  'preuve.unlock.2': 'Le brief IA de correction',
  'preuve.unlock.2b':
    'Un plan d’action prêt à transmettre à votre prestataire.',
  'preuve.unlock.3': 'Le partage public ou équipe',
  'preuve.unlock.3b': 'Un lien propre, sans exposer de donnée sensible.',
  'preuve.unlock.4': 'Les tests actifs',
  'preuve.unlock.4b':
    'Sondes approfondies, lancées seulement sur un domaine prouvé.',
  'preuve.later': 'Plus tard',
  'preuve.sondes': 'Sondes neutres · France',
  'preuve.steps': 'Étapes',
  'preuve.step.1': 'Méthode',
  'preuve.step.2': 'Publication',
  'preuve.step.3': 'Détection',
  'preuve.hint.meta': 'Rapide',
  'preuve.hint.file': 'Sans code',
  'preuve.hint.known': 'Fichier',
  'preuve.hint.dns': 'Registrar',
  'preuve.hint.gsc': 'Recommandé',
  'preuve.selected': 'Méthode sélectionnée',
  'preuve.code.title': 'Code HTML à insérer dans l’en-tête',
  'preuve.code.ready': 'Prêt à copier',
  'preuve.dock': 'Domaine : {host} · Méthode : {method}',
  'preuve.copy.snippet': 'Copier le snippet',
  'preuve.sim': 'Résultat simulé (aperçu)',
  'preuve.sim.ok': 'Succès',
  'preuve.sim.fail': 'Jeton introuvable',
  'preuve.detect.kicker': 'Statut de la vérification',
  'preuve.detect': 'Où en est la détection',
  'preuve.detect.auto':
    'Revérification automatique. Audixio vérifie de nouveau, en mode passif, la présence du jeton avant chaque test actif.',
  'preuve.alt.1': 'État initial',
  'preuve.alt.1b':
    '« En attente de vérification ». La détection part au clic sur « Vérifier maintenant ».',
  'preuve.alt.1t': 'En attente',
  'preuve.alt.2': 'Vérifiée',
  'preuve.alt.2b':
    'Jeton détecté et horodaté. Rapport complet, brief IA et partage débloqués.',
  'preuve.alt.2t': 'Confirmée',
  'preuve.alt.3': 'Échec soft',
  'preuve.alt.3b':
    '« Jeton introuvable. » Aucune pénalité, relance manuelle immédiate.',
  'preuve.alt.3t': '404 ou vide',
  'preuve.gov.kicker': 'Gouvernance technique',
  'preuve.gov': 'Une preuve sans accès à votre serveur',
  'preuve.gov.1':
    'Vérification strictement passive, depuis des sondes réseau neutres situées en France.',
  'preuve.gov.2':
    'Aucun cookie traceur ni script d’analyse tiers déposé sur votre plateforme.',
  'preuve.gov.3':
    'Le jeton prouve la gouvernance éditoriale sans donner d’accès critique au serveur.',
  'preuve.google': 'Continuer avec Google',
  'preuve.google.secure': 'Protocole officiel sécurisé',
  'preuve.sv.idle.b': 'En attente',
  'preuve.sv.idle.t': 'En attente de vérification',
  'preuve.sv.idle.p':
    'La détection démarre dès que vous cliquez sur « Vérifier maintenant ».',
  'preuve.sv.scan.b': 'Détection en cours',
  'preuve.sv.scan.t': 'Recherche du jeton',
  'preuve.sv.scan.p': 'Sondes réseau neutres situées en France.',
  'preuve.sv.ok.b': 'Propriété vérifiée',
  'preuve.sv.ok.t': 'Contrôle du domaine confirmé',
  'preuve.sv.ok.p': 'Le jeton a été détecté. Le rapport complet est ouvert.',
  'preuve.sv.fail.b': 'Détection non aboutie',
  'preuve.sv.fail.t': 'Jeton introuvable',
  'preuve.sv.fail.p':
    'Vérifiez la publication ou attendez la propagation, puis réessayez. Aucune pénalité.',
  'hub.px.t1': 'Images trop lourdes',
  'hub.px.t2': 'Description manquante pour Google',
  'hub.px.t3': 'Protection de base incomplète',
  'hub.px.t4': 'Contrastes de texte insuffisants',
  'hub.px.t5': 'Pages trop lourdes pour l’écologie',
  'hub.px.t6': 'Titres de page trop génériques',
  'hub.px.t7': 'Erreurs techniques mineures',
  'hub.px.t8': 'Textes d’images incomplets',
  'hub.px.t9': 'Configuration e-mail à renforcer',
  'hub.px.t10': 'Petites améliorations de structure',
  'domaine.px.t1': 'Images trop volumineuses à l’ouverture',
  'domaine.px.w1':
    'Des photos haute définition se chargent en pleine taille, même sur smartphone.',
  'domaine.px.t2': 'Scripts qui s’exécutent trop tôt',
  'domaine.px.w2':
    'Le navigateur bloque l’affichage tant que des widgets annexes n’ont pas fini de tourner.',
  'domaine.px.t3': 'Trop de styles d’écriture téléchargés',
  'domaine.px.w3':
    '4 familles de polices sont appelées, avec 8 variantes d’épaisseur superflues.',
  'domaine.px.t4': 'Compression des fichiers de code activée (Gzip / Brotli)',
  'domaine.px.w4':
    'Les pages et les feuilles de style sont compactées avant l’envoi.',
  'domaine.px.t5': 'Mise en cache du navigateur configurée',
  'domaine.px.w5':
    'Les éléments fixes ne sont pas re-téléchargés à chaque nouvelle page visitée.',
  'hub.note.sub': 'Moyenne des {n} domaines testés sur 8',
  'hub.prio.sub': 'Du plus urgent au moins urgent · {n} points',
  'hub.untested': 'Non testé',
  'hub.rose.title': 'Note globale {grade}, {score} sur 100',
  'hub.rose.desc': 'Rose des scores par domaine : {summary}.',
  'hub.rose.untested': '{name} non testé',
  'hub.ai.eyebrow': 'Gain de temps immédiat',
  'hub.eco.lead': 'Pourquoi Audixio mesure le poids des pages :',
  'hub.eco.link': 'notre démarche d’écoconception',
  'share.lead.before':
    'Toute personne disposant du lien peut consulter le rapport de',
  'share.lead.after': ', sans compte.',
  'share.public': 'Lien public',
  'share.active': 'Lien actif',
  'share.copied.long': 'Lien copié dans le presse-papiers.',
  'share.created': 'Lien public créé.',
  'share.close.long': 'Fermer et revenir au rapport',
  'constat.back': 'Retour à {name}',
  'constat.heading': 'Détail du constat',
  'constat.pick':
    'Choisissez un site ou un rapport, puis un constat, pour en voir le détail.',
  'constat.owned': 'Propriété vérifiée',
  'constat.tag': '{domain} · Constat n° {n}',
  'constat.crit': 'Priorité critique',
  'constat.fix': 'À corriger',
  'constat.check': 'À vérifier',
  'constat.minor': 'Mineur',
  'constat.plan.link': 'Voir le plan d’action',
  'constat.share': 'Partager',
  'constat.pdf': 'Exporter en PDF',
  'constat.shared': 'Lien de la page copié',
  'constat.pdf.ready': 'Export PDF prêt',
  'constat.stat.weight': 'Poids total détecté',
  'constat.stat.wait': 'Temps d’attente estimé',
  'constat.stat.files': 'Fichiers concernés',
  'constat.mo': 'Mo',
  'constat.sec': 's',
  'constat.images': 'images',
  'constat.weight.target': 'Cible : < 650 Ko',
  'constat.weight.gain': '−91 % possible',
  'constat.wait.net': 'Connexion 4G mobile',
  'constat.wait.risk': 'Risque de rebond accru',
  'constat.files.kind': 'JPEG et PNG bruts',
  'constat.files.modern': '0 WebP / AVIF',
  'constat.sim.k': 'Simulateur',
  'constat.sim.h': 'Ce que vos visiteurs ressentent vraiment',
  'constat.sim.p':
    'Choisissez une connexion pour comparer le chargement des images de votre page d’accueil, avant et après optimisation.',
  'constat.net': 'Type de connexion',
  'constat.net.4g': '4G mobile',
  'constat.net.3g': '3G faible',
  'constat.net.fibre': 'Fibre',
  'constat.today': 'Aujourd’hui',
  'constat.after': 'Après optimisation',
  'constat.gained': 'Temps gagné :',
  'constat.replay': 'Rejouer',
  'constat.sim.note':
    'Estimation théorique du transfert des images seules, hors latence serveur et décodage.',
  'constat.inv.k': 'Inventaire',
  'constat.inv.h': 'Liste des images à optimiser',
  'constat.inv.p': 'Classées par gain potentiel sur la vitesse de chargement.',
  'constat.filter': 'Filtrer par nom',
  'constat.filter.ph': 'ex. hero, portrait…',
  'constat.col.file': 'Image / fichier',
  'constat.col.now': 'Poids actuel',
  'constat.col.next': 'Poids estimé',
  'constat.col.save': 'Économie',
  'constat.cap':
    '{n} images affichées sur {total} · poids actuel, poids estimé après compression et économie par image',
  'constat.none': 'Aucune image ne correspond à votre recherche.',
  'constat.sum.now': 'Total actuel :',
  'constat.sum.next': 'Total estimé :',
  'constat.sum.save': 'Économie globale :',
  'constat.res.k': 'Résolution',
  'constat.res.h': 'Plan d’action en 3 étapes',
  'constat.res.p':
    'Choisissez la version qui vous correspond : sans code via votre CMS, ou technique si vous gérez le site vous-même.',
  'constat.tabs': 'Version du plan d’action',
  'constat.cms': 'Avec mon CMS',
  'constat.code': 'Avec du code',
  'constat.step': 'Étape {n} :',
  'constat.copy': 'Copier',
  'constat.copied': 'Code copié dans le presse-papiers',
  'constat.code.name': 'Exemple de code HTML',
  'constat.code.file': 'index.html · balise picture',
  'constat.ai.k': 'Gagnez du temps',
  'constat.ai.h': 'Consigne IA prête à l’emploi',
  'constat.ai.p':
    'Un brief complet à coller dans votre assistant, avec le contexte de ce constat.',
  'constat.ai.cta': 'Ouvrir le brief IA',
  'constat.ai.chip': 'Brief IA · prêt à coller',
  'constat.ai.l1':
    'Agis en expert performance web. Analyse et optimise les images listées :',
  'constat.ai.l2':
    'convertis en formats modernes, génère les variantes responsive, puis fournis le script de conversion.',
  'constat.pager': 'Constats du domaine {name}',
  'constat.prev': 'Problème précédent',
  'constat.next': 'Problème suivant',
  'constat.backdom': 'Retour à la synthèse {name}',
  'constat.missing': 'Ce constat n’est pas disponible dans ce rapport.',
  'constat.px.title': 'Images trop volumineuses à l’ouverture',
  'constat.px.lede':
    '6 images non compressées alourdissent votre page d’accueil de 4,8 Mo et retardent l’affichage utile pour vos visiteurs sur mobile et en 4G. Bonne nouvelle : c’est l’un des correctifs les plus rapides et les plus rentables.',
  'constat.px.prev': 'Scripts JavaScript non différés',
  'constat.px.next': 'Polices web non préchargées',
  'constat.cms1.t': 'Convertir en WebP / AVIF',
  'constat.cms1.p':
    'Installez un plugin d’optimisation (Imagify, ShortPixel ou Smush). Il convertit vos fichiers existants sans réimport manuel.',
  'constat.cms1.g': 'Gain moyen : −85 %',
  'constat.cms2.t': 'Redimensionner à la taille d’affichage',
  'constat.cms2.p':
    'La bannière fait 4000 px de large : réduisez-la à 1920 px maximum avant de l’envoyer dans votre bibliothèque de médias.',
  'constat.cms2.g': 'Évite le surcoût mobile',
  'constat.cms3.t': 'Activer le chargement différé',
  'constat.cms3.p':
    'Vérifiez que le chargement différé est actif sur les images sous la ligne de flottaison : seuls le titre et le logo doivent charger en priorité.',
  'constat.cms3.g': 'Améliore le LCP et le TBT',
  'constat.code1.t': 'Convertir en WebP / AVIF',
  'constat.code1.p':
    'Générez les formats modernes avec un outil de conversion en qualité 80, puis servez-les via la balise picture.',
  'constat.code1.g': 'Gain moyen : −85 %',
  'constat.code2.t': 'Redimensionner avec srcset',
  'constat.code2.p':
    'Produisez 3 paliers : 640, 1024 et 1920, et renseignez l’attribut sizes en cohérence avec vos media queries.',
  'constat.code2.g': 'Évite le surcoût mobile',
  'constat.code3.t': 'Prioriser et différer',
  'constat.code3.p':
    'Priorité haute sur la première image, chargement différé sur les autres.',
  'constat.code3.g': 'Améliore le LCP et le TBT',
  'constat.generic.h': 'Ce qui a été mesuré',
  'constat.generic.p':
    'Les éléments reliés à ce constat, du plus lourd au plus léger.',
  'plan.lede':
    'Les constats du rapport transformés en tâches, classées par impact et par effort. Commencez par les gains rapides : fort impact, faible effort.',
  'plan.eyebrow': '{host} · issu du brief IA',
  'plan.kpi.done': 'Faites',
  'plan.bar': 'Avancement du plan',
  'plan.where': 'Où commencer',
  'plan.q1': 'Gains rapides',
  'plan.q1p': 'Fort impact, faible effort : à faire cette semaine.',
  'plan.q2': 'Chantiers',
  'plan.q2p': 'Fort impact, effort plus important : à planifier.',
  'plan.q3': 'Petites retouches',
  'plan.q3p': 'Impact modéré, vite faites.',
  'plan.q4': 'Plus tard',
  'plan.q4p': 'Impact faible, effort plus important.',
  'plan.tasks': 'Tâches',
  'plan.filters': 'Filtres',
  'plan.badge.crit': 'Critique',
  'plan.all': 'Toutes',
  'plan.sort': 'Tri',
  'plan.sort.prio': 'Priorité',
  'plan.sort.eff': 'Effort faible d’abord',
  'plan.impact': 'Impact',
  'plan.effort': 'Effort',
  'plan.high': 'fort',
  'plan.mid': 'moyen',
  'plan.low': 'faible',
  'plan.detail': 'Voir le détail',
  'plan.domain': 'Domaine {name}',
  'plan.empty': 'Aucune tâche avec ce filtre.',
  'plan.count.one': '{n} tâche affichée',
  'plan.count.many': '{n} tâches affichées',
  'plan.more': 'Aller plus loin',
  'plan.brief': 'Brief IA',
  'plan.brief.d': 'Le prompt de correction pour votre assistant.',
  'plan.report': 'Rapport complet',
  'plan.report.d': 'Note globale et 8 domaines.',
  'plan.pdf': 'Export PDF',
  'plan.pdf.d': 'Version imprimable à partager.',
  'plan.crumb': 'Plan d’action',
  'plan.sites': 'Sites suivis',
  'plan.status.set': 'Statut : {label}',
  'plan.px.t1': 'Supprimer les traceurs déposés avant consentement',
  'plan.px.w1':
    'Bloquez les 3 scripts publicitaires tant que le visiteur n’a pas accepté.',
  'plan.px.t2': 'Ajouter une politique de sécurité du contenu (CSP)',
  'plan.px.w2':
    'Commencez en mode observation pour repérer les ressources à autoriser.',
  'plan.px.t3': 'Compresser les images de la page d’accueil',
  'plan.px.w3': 'Convertissez en WebP/AVIF et indiquez largeur et hauteur.',
  'plan.px.t4': 'Corriger les contrastes du pied de page',
  'plan.px.w4': '7 textes sous le ratio 4,5:1 ; assombrir le gris utilisé.',
  'plan.px.t5': 'Ajouter l’en-tête Referrer-Policy',
  'plan.px.w5': 'Une ligne de configuration serveur suffit.',
  'plan.px.t6': 'Différer les polices non utilisées',
  'plan.px.w6': 'Des graisses sont chargées sans usage visible.',
  'plan.px.t7': 'Ajouter un texte alternatif aux images de la galerie',
  'plan.px.w7': 'Décrire l’image, pas son nom de fichier.',
  'brief.crumb.ai': 'Assistant IA',
  'brief.crumb.here': 'Configuration du brief',
  'brief.verified': 'Propriété vérifiée',
  'brief.back': 'Retour au rapport d’audit · {host}',
  'brief.sync': 'Synchronisation automatique active',
  'brief.h1.1': 'Configuration',
  'brief.h1.2': 'de',
  'brief.h1.3': 'votre',
  'brief.h1.4': 'prompt IA',
  'brief.lead':
    'Personnalisez la consigne transmise à vos assistants (Cursor, ChatGPT, Claude). Pour chaque point détecté, décidez si l’assistant doit l’ignorer, l’analyser ou le corriger.',
  'brief.stats': 'Répartition des constats',
  'brief.total': 'constats détectés',
  'brief.total.one': 'constat détecté',
  'brief.tofix': 'à corriger',
  'brief.tocheck': 'à vérifier',
  'brief.toskip': 'ignorés',
  'brief.toskip.one': 'ignoré',
  'brief.presets': 'Réglages rapides',
  'brief.rec': 'Recommandé',
  'brief.crit': 'Critique uniquement',
  'brief.all': 'Tout corriger',
  'brief.none': 'Tout ignorer',
  'brief.leg.fix': 'À corriger',
  'brief.leg.check': 'À vérifier',
  'brief.leg.skip': 'Ignoré',
  'brief.hint':
    'Chaque flux alimente votre brief. Cliquez sur une planète pour ouvrir son domaine.',
  'brief.step1': 'Étape 1',
  'brief.dom.h': 'Domaines d’audit (8)',
  'brief.dom.p':
    'Ouvrez un domaine et choisissez, pour chaque constat, l’action que l’assistant doit entreprendre.',
  'brief.step2': 'Étape 2',
  'brief.preview.h': 'Rendu du prompt prêt pour votre assistant',
  'brief.preview.p':
    'Ce brief se met à jour en direct selon vos choix. Copiez-le ou téléchargez le fichier pour votre assistant.',
  'brief.file': 'audixio-prompt-remediation.md',
  'brief.export.partial': 'Audixio Brief — PARTIEL (Site non vérifié)',
  'brief.export.full': 'Audixio Brief — COMPLET (Site vérifié)',
  'brief.meta': 'Markdown LLM v1.2',
  'brief.tokens': '≈ {n} tokens',
  'brief.md': 'Aperçu du brief Markdown',
  'brief.copy': 'Copier le prompt pour votre assistant IA',
  'brief.dl': 'Télécharger (.md)',
  'brief.pdf': 'Exporter en PDF',
  'brief.plan': 'Voir le plan d’action',
  'brief.foot': 'Collez directement ce prompt dans votre assistant.',
  'brief.dock': 'Résumé de la configuration',
  'brief.dock.copy': 'Copier le prompt',
  'brief.dock.line': '{fix} à corriger · {check} à vérifier',
  'brief.copied': 'Prompt copié dans le presse-papiers',
  'brief.saved': 'Fichier .md téléchargé',
  'brief.preset.done': 'Réglage « {name} » appliqué',
  'brief.sev.crit': 'Critique',
  'brief.sev.imp': 'Important',
  'brief.sev.mod': 'Modéré',
  'brief.act.for': 'Action pour « {title} »',
  'brief.act.skip': 'Rien',
  'brief.act.check': 'Vérifier',
  'brief.act.fix': 'Corriger',
  'brief.grade': 'Note {grade} · {score}/100',
  'brief.n.one': '{n} constat',
  'brief.n.many': '{n} constats',
  'brief.dot.fix': '{n} corriger',
  'brief.dot.check': '{n} vérifier',
  'brief.dot.skip.one': '{n} ignoré',
  'brief.dot.skip.many': '{n} ignorés',
  'brief.untested': 'Non testé',
  'brief.launch': 'Lancer le test',
  'brief.locked': 'Verrouillé',
  'brief.empty':
    'Aucun point sélectionné pour le moment. Passez au moins un constat sur « À vérifier » ou « Corriger ».',
  'brief.h.fix': 'Actions prioritaires (À corriger)',
  'brief.h.check': 'Points d’investigation (À vérifier)',
  'brief.note.skip':
    'Note : ce point est ignoré (Rien) conformément à vos choix.',
  'brief.title': 'Brief de remédiation technique • {host}',
  'brief.generated':
    'Généré automatiquement par Audixio, optimisé pour votre assistant.',
  'brief.role.line':
    'Rôle : tu es un ingénieur web senior spécialisé en performance, référencement, protection et accès.',
  'brief.mission':
    'Mission : applique les corrections prioritaires et examine les points à vérifier pour {host}. Ignore tout point non listé.',
  'brief.name.performance': 'Performance web',
  'brief.name.seo': 'Référencement',
  'brief.name.securite': 'Sécurité',
  'brief.name.ecologie': 'Écologie et éco-conception',
  'brief.name.accessibilite': 'Accessibilité numérique',
  'brief.name.qualite': 'Qualité technique du code',
  'brief.name.vie_privee': 'Vie privée',
  'brief.name.dns_email': 'Configuration DNS et messagerie',
  'brief.short.performance': 'Perf',
  'brief.short.seo': 'SEO',
  'brief.short.securite': 'Sécu',
  'brief.short.ecologie': 'Éco',
  'brief.short.accessibilite': 'Accès',
  'brief.short.qualite': 'Code',
  'brief.short.vie_privee': 'Privé',
  'brief.short.dns_email': 'DNS',
  'brief.px.t1': 'Images trop volumineuses à l’ouverture',
  'brief.px.d1':
    '4,8 Mo sur l’image principale. Convertir en formats modernes et différer le chargement.',
  'brief.px.t2': 'Polices de caractères trop nombreuses',
  'brief.px.d2':
    '5 variantes bloquent l’affichage initial. Rationaliser à 2 familles.',
  'brief.px.t3': 'Scripts JavaScript bloquants',
  'brief.px.d3': '3 bibliothèques tierces se chargent sans attendre.',
  'brief.px.t4': 'Métadonnées et OpenGraph incomplètes',
  'brief.px.d4':
    'La description et les balises de partage ne sont pas alignées.',
  'brief.px.t5': 'Titres de pages à optimiser',
  'brief.px.d5': 'Certains titres sont trop longs ou répétés.',
  'brief.px.t6': 'En-têtes HTTP de sécurité absents',
  'brief.px.d6': 'Des en-têtes de protection ne sont pas configurés.',
  'brief.px.t7': 'Cookies sans attributs de sécurité',
  'brief.px.d7': 'Les cookies de session n’ont pas les attributs attendus.',
  'brief.px.t8': 'Version du CMS exposée',
  'brief.px.d8': 'La version du CMS est visible dans le code source.',
  'brief.px.t9': 'Vidéo en lecture automatique',
  'brief.px.d9': 'Une vidéo se charge dès l’ouverture, même hors écran.',
  'brief.px.t10': 'Hébergement à vérifier',
  'brief.px.d10':
    'Impossible de confirmer une énergie bas carbone chez l’hébergeur.',
  'brief.px.t11': 'Images sans texte alternatif',
  'brief.px.d11':
    'Plusieurs images informatives n’ont pas de texte alternatif.',
  'brief.px.t12': 'Contrastes de couleurs insuffisants',
  'brief.px.d12': 'Certains textes n’atteignent pas le ratio attendu.',
  'brief.px.t13': 'Erreurs dans la console JavaScript',
  'brief.px.d13': 'Des erreurs et des avertissements sont émis au chargement.',
  'brief.px.t14': 'Enregistrement DMARC à durcir',
  'brief.px.d14': 'La politique DMARC est en mode surveillance uniquement.',
  'brief.noscript':
    'JavaScript est nécessaire pour configurer le brief. Les 8 domaines audités restent listés dans le rapport.',
  'badge.kicker': '{host} · note {grade}',
  'badge.kicker.plain': '{host}',
  'badge.style': 'Style du badge',
  'badge.full': 'Complet',
  'badge.full.d': 'Logo, libellé et note',
  'badge.compact': 'Compact',
  'badge.compact.d': 'Pour un pied de page',
  'badge.pill': 'Pastille',
  'badge.pill.d': 'Le plus discret',
  'badge.preview': 'Aperçu du badge',
  'badge.by': 'Audité par Audixio',
  'badge.note': 'Note du site',
  'badge.alt': 'Aperçu : badge Audixio, note {grade} pour {host}',
  'badge.alt.none': 'Aperçu : badge Audixio pour {host}',
  'badge.code': 'Code à coller dans votre site',
  'badge.link': 'Lien public du rapport',
  'badge.copy.link': 'Copier le lien',
  'badge.copied.short': 'Copié',
  'badge.copied.link': 'Lien copié',
  'badge.style.say': 'Style {name} sélectionné',
  'badge.foot':
    'Le lien public n’affiche que le résumé du rapport. Vous pouvez le révoquer à tout moment ; le badge affichera alors « non disponible ».',
  'badge.public': 'Voir la page publique',
  'badge.close': 'Fermer et revenir au rapport',
  'badge.unavailable': 'non disponible',
} as const satisfies Record<string, string>;

export const fr = {
  ...frCore,
  ...mqFr,
  ...espaceFr,
  ...espaceUiFr,
  ...mqGatesFr,
  ...mqLegalFr,
  ...pdfFr,
};

export type MessageKey = keyof typeof fr;
