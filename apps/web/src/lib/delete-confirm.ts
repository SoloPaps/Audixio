// Mot de confirmation de la suppression du compte (/compte).
// FR : « supprimer » seul. EN : le mot affiché (« delete ») ou « supprimer »,
// pour qui change de langue en cours de route. Comparaison exacte après trim
// et minuscules. Le mot tapé reste une affaire d’interface : l’API reçoit
// toujours le jeton canonique `{ confirm: 'supprimer' }` (contrat inchangé).

export const DELETE_TOKEN = 'supprimer';
const SHOWN_WORDS = new Set(['supprimer', 'delete']);

/** Vrai si `typed` confirme ; `shown` est le mot affiché (t('mq.co.180')). */
export function deleteConfirmed(typed: string, shown: string): boolean {
  const value = typed.trim().toLocaleLowerCase('fr');
  if (value === DELETE_TOKEN) return true;
  const word = shown.trim().toLocaleLowerCase('fr');
  // Un pack de langue fautif ne peut pas rendre la confirmation triviale.
  return SHOWN_WORDS.has(word) && value === word;
}
