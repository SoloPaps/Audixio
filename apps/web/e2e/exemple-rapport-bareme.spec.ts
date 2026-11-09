import { expect, test } from '@playwright/test';
import { gradeForScore } from '../src/lib/grade.js';

// Décision du propriétaire : /exemple-rapport suit le barème officiel
// (A 90 · B 80 · C 65 · D 50 · E 35), plus son ancien A90/B70/C50.

test('exemple-rapport : lettres, rosace et anneaux suivent le barème officiel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/exemple-rapport?theme=light');
  await expect(page.locator('#roseD')).toBeAttached({ timeout: 15_000 });

  const cards = await page.locator('.dom[data-score]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      short: node.getAttribute('data-short') ?? '',
      score: Number(node.getAttribute('data-score')),
      chip: node.querySelector('.gchip')?.textContent?.trim() ?? '',
    })),
  );
  expect(cards).toHaveLength(7);
  // Les lettres affichées restent celles d’avant (C, B, C, C, B, B, A).
  expect(cards.map((card) => card.chip)).toEqual([
    'C',
    'B',
    'C',
    'C',
    'B',
    'B',
    'A',
  ]);
  for (const card of cards) {
    expect(card.chip, `${card.short} ${card.score}`).toBe(
      gradeForScore(card.score),
    );
  }

  // La rosace (script inline) calcule avec le même barème.
  const summary = cards
    .map((card) => `${card.short} ${gradeForScore(card.score)}`)
    .join(', ');
  await expect(page.locator('#roseD')).toHaveText(
    `Rose des scores par domaine : ${summary}, Vie privée non testé.`,
  );
  const mean = Math.round(
    cards.reduce((sum, card) => sum + card.score, 0) / cards.length,
  );
  expect(gradeForScore(mean)).toBe('B');
  await expect(page.locator('#roseT')).toHaveText(
    'Note globale B, moyenne des 7 domaines testés sur 8',
  );

  // Anneaux C · B · A posés sur 65, 80 et 90.
  const rings = await page.locator('#rose .scale-t').allTextContents();
  expect(rings).toEqual(['C', 'B', 'A']);
  const grades = await page.locator('#rose').getAttribute('data-grades');
  expect(JSON.parse(grades ?? '{}')).toEqual({
    A: 90,
    B: 80,
    C: 65,
    D: 50,
    E: 35,
    F: 0,
  });

  // Encart final : la note affichée correspond à sa lettre.
  const fin = page.locator('.fin2-grade');
  const finScore = Number(await fin.locator('.s b').textContent());
  await expect(fin.locator('.L')).toHaveText(
    gradeForScore(finScore) ?? 'absent',
  );
});
