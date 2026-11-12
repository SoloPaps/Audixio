import type { site6Fr } from './site6-fr.js';

/** Anglais des clés st.* et ct.*. Recopié dans dictionnaire-en.json. */
export const site6En: { [K in keyof typeof site6Fr]: string } = {
  'st.meta.title': 'Your site — Audixio',
  'st.meta.description':
    'Audits, history, verification and sharing for a tracked site.',
  'st.meta.resolve.title': 'Opening the site — Audixio',
  'st.resolve': 'Opening the site…',
  'st.loading': 'Loading the site…',
  'st.need_login': 'Sign in to open this site.',
  'st.missing.title': 'This site is not in your account.',
  'st.missing.lead':
    'The address matches no site tracked by this account. It may have been removed.',
  'st.missing.back': 'Back to my sites',
  'st.crumbs': 'Breadcrumb',
  'st.eyebrow': 'Tracked site',
  'st.lede':
    'Everything about this site in one place: its audits, how they change, proof that it is yours and what you share.',
  'st.last': 'Last audit on {date}',
  'st.never': 'No finished audit yet',
  'st.relaunch': 'Run an audit',
  'st.report': 'Open the latest report',
  'st.tabs.label': 'Site sections',
  'st.tab.audits': 'Audits',
  'st.tab.historique': 'History',
  'st.tab.verification': 'Verification',
  'st.tab.partage': 'Sharing',
  'st.guide.audits': 'Read each report, newest first.',
  'st.guide.historique':
    'See whether the score goes up or down between audits.',
  'st.guide.verification': 'Prove the site is yours before any active test.',
  'st.guide.partage': 'Make the score public or send a read-only link.',
  'st.hist.title': 'How the score changes',
  'st.audits.title': 'Site audits',
  'st.audits.lead':
    'Every finished audit, newest first. Open one to read its report.',
  'st.audits.empty':
    'No finished audit for this site. Run one: the report arrives in a few minutes.',
  'st.audits.open': 'Open the report',
  'st.audits.latest': 'Latest',
  'st.audits.noscore': 'Score unavailable',
  'st.audits.ref': 'Ref. {ref}',
  'st.audits.depth':
    'The free account keeps the latest audit. The full history comes with Pro.',
  'st.audits.depth.cta': 'See Pro',
  'st.partage.title': 'Share this site',
  'st.partage.lead':
    'Make the score public, create a read-only link or download the badge. You can take any of it back at any time.',
  'st.partage.access': 'See access requests received',
  'ct.tabs.label': 'Account sections',
  'ct.tab.profil': 'Profile',
  'ct.tab.alertes': 'Alerts',
  'ct.tab.abonnement': 'Subscription',
};
