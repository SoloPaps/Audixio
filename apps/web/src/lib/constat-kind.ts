/** L’inventaire d’images ne concerne que le constat vitrine correspondant. */
export function constatShowsImageInventory(
  messageKey: string | undefined,
): boolean {
  return messageKey === 'constat.px.title';
}
