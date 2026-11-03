import type { LienRapport, LinkRecord } from '@audigy/db';
import type { LienDeps, LienStore } from '@audigy/orchestrator';
import { expect, test } from '@playwright/test';
import { register } from 'tsx/esm/api';

register();

const { sha256Hex, shareTokenFromBytes } = await import('@audigy/db');
const { handleLien, handlePartage } = await import('@audigy/orchestrator');

const USER = '33333333-3333-4333-8333-333333333333';
const AUDIT = '22222222-2222-4222-8222-222222222222';
const TOKEN_AUTH = 'jeton-de-test-0001';
const SECRET = 'mesure-secrete-hsts';

function rapport(): LienRapport {
  return {
    label: 'Exemple',
    url: 'https://exemple.fr',
    finishedAt: '2026-11-01T08:00:00.000Z',
    methodVersion: '2026.1',
    globalScore: 72,
    globalGrade: 'C',
    auditId: AUDIT,
    domains: [{ domain: 'securite', score: 40, grade: 'E', level: 'problem' }],
    findings: [
      {
        domain: 'securite',
        checkId: 'securite.hsts',
        status: 'fail',
        severity: 4,
        messageKey: 'finding.securite.hsts',
        measured: SECRET,
        fixKey: 'fix.securite.hsts',
      },
    ],
    briefPartiel: null,
    briefComplet: 'brief-complet-secret',
  };
}

function box() {
  const links: LinkRecord[] = [];
  const tokens = new Map<string, string>();
  const refusals: string[] = [];
  const lines: string[] = [];
  const store: LienStore = {
    now: () => new Date('2026-11-03T12:00:00.000Z'),
    async planOf() {
      return 'free';
    },
    async owns(userId, auditId) {
      return userId === USER && auditId === AUDIT;
    },
    async verified() {
      return true;
    },
    async linksOf(userId) {
      return links.filter((row) => row.ownerId === userId);
    },
    async tokenOf(hash) {
      return tokens.get(hash) ?? null;
    },
    async mint(input) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const token = shareTokenFromBytes(bytes);
      const tokenHash = await sha256Hex(token);
      const record: LinkRecord = {
        id: crypto.randomUUID(),
        auditId: input.auditId,
        ownerId: input.ownerId,
        kind: input.kind,
        tokenHash,
        createdAt: '2026-11-03T12:00:00.000Z',
        expiresAt: input.expiresAt,
        revokedAt: null,
        ownerVerified: input.ownerVerified,
        avecBrief: input.avecBrief,
      };
      links.push(record);
      tokens.set(tokenHash, token);
      return { record, token };
    },
    async markRevoked(link, at) {
      link.revokedAt = at;
    },
    async byTokenHash(hash) {
      return links.find((row) => row.tokenHash === hash) ?? null;
    },
    async rapport() {
      return rapport();
    },
    async refuse(entry) {
      refusals.push(entry.requestId);
    },
  };
  const deps: LienDeps = {
    logger: {
      info(event, fields) {
        lines.push(JSON.stringify({ event, ...fields }));
      },
      warn(event, fields) {
        lines.push(JSON.stringify({ event, ...fields }));
      },
      error(event, fields) {
        lines.push(JSON.stringify({ event, ...fields }));
      },
    },
    store,
    async userFromToken(token) {
      return token === TOKEN_AUTH ? USER : null;
    },
  };
  return { links, refusals, lines, deps };
}

test('la page d’acceptation refuse, accorde, puis retire', async ({ page }) => {
  const state = box();
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: TOKEN_AUTH,
          user: { id: USER },
        }),
      });
      return;
    }
    if (
      !url.pathname.startsWith('/api/liens') &&
      url.pathname !== '/api/partage'
    ) {
      await route.continue();
      return;
    }
    const body = req.postData();
    const request = new Request(req.url(), {
      method: req.method(),
      headers: req.headers(),
      ...(body && req.method() !== 'GET' ? { body } : {}),
    });
    const response = url.pathname.startsWith('/api/partage')
      ? await handlePartage(request, state.deps)
      : await handleLien(request, state.deps);
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: await response.text(),
    });
  });

  await page.goto(
    `/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light&audit=${AUDIT}`,
  );
  await page.locator('#no').click();
  await page.locator('#no-ok').click();
  await expect.poll(() => state.refusals).toEqual(['req_948f2a1b7e']);
  expect(state.links).toEqual([]);
  await expect(page.locator('#status')).toHaveText('Refusée');

  await page.goto(
    `/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light&audit=${AUDIT}`,
  );
  await page.locator('#ok').click();
  await expect(page.locator('#pane-ok')).toBeVisible();
  await expect(page.locator('#pane-ok')).toHaveAttribute(
    'data-lien',
    /^\/partage\/[0-9a-f]{32}$/,
  );
  const share =
    (await page.locator('#pane-ok').getAttribute('data-lien')) ?? '';
  const token = share.slice('/partage/'.length);
  expect(state.lines.join('\n')).not.toContain(token);
  const open = await handlePartage(
    new Request('http://127.0.0.1/api/partage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    }),
    state.deps,
  );
  const vue = await open.text();
  expect(open.status).toBe(200);
  expect(vue).toContain(SECRET);

  await page.locator('#undo').click();
  await expect.poll(() => state.links[0]?.revokedAt).toBeTruthy();
  const after = await handlePartage(
    new Request('http://127.0.0.1/api/partage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    }),
    state.deps,
  );
  const limited = await after.text();
  expect(after.status).toBe(200);
  expect(limited).not.toContain(SECRET);
  expect(limited).toContain('"access":"retired"');
});
