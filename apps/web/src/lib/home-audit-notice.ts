/** Texte de l’alerte du champ d’accueil. Le délai d’hôte prime sur l’erreur d’URL. */
export function homeFormAlert(input: {
  invalidUrl: boolean;
  apiMessage: string;
  urlError: string;
}): string {
  if (input.apiMessage !== '') return input.apiMessage;
  if (input.invalidUrl) return input.urlError;
  return '';
}
