export interface DockZone {
  top: number;
  bottom: number;
}

/** Section active : la dernière dont le haut a passé la ligne. Masquée sur les zones données. */
export function dockState(
  tops: readonly number[],
  line: number,
  hidden: readonly DockZone[],
): { active: number; on: boolean } {
  let active = 0;
  tops.forEach((top, index) => {
    if (top <= line) active = index;
  });
  const on = !hidden.some((zone) => zone.top < line && zone.bottom > 0);
  return { active, on };
}
