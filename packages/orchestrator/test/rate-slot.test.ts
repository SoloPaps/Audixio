import { describe, expect, it } from 'vitest';
import { type AccountAction, accountLimit } from '../src/account.js';
import { takeAccountSlot } from '../src/account-db.js';
import { SEARCH_LIMIT, takePlacesSlot } from '../src/places.js';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-11-03T04:00:00.000Z');

/**
 * Compteur partagé. La lecture puis l’écriture perd une mise à jour.
 * `rpc` incrémente pour de vrai.
 */
function racing(start: number) {
  let count = start;
  const waiters: Array<(snapshot: number) => void> = [];
  const client = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return new Promise((resolve) => {
            waiters.push((snapshot) => {
              resolve({ data: { count: snapshot }, error: null });
            });
            if (waiters.length === 2) {
              const snapshot = count;
              const pending = waiters.splice(0, 2);
              for (const resume of pending) resume(snapshot);
            }
          });
        },
        upsert(row: { count: number }) {
          count = row.count;
          return { error: null };
        },
      };
    },
    async rpc(_name: string, args: { p_limit: number }) {
      count += 1;
      return { data: count <= args.p_limit, error: null };
    },
  };
  return client;
}

async function both(run: () => Promise<boolean>): Promise<number> {
  const [left, right] = await Promise.all([run(), run()]);
  return [left, right].filter(Boolean).length;
}

describe('plafonds atomiques', () => {
  it('une course Places ne prend pas la dernière place deux fois', async () => {
    const client = racing(SEARCH_LIMIT - 1);
    const taken = await both(() => takePlacesSlot(client as never, USER, NOW));
    expect(taken).toBe(1);
  });

  it('une course de suppression de compte ne dépasse pas le plafond', async () => {
    const action: AccountAction = 'delete';
    const client = racing(accountLimit(action) - 1);
    const taken = await both(() =>
      takeAccountSlot(client as never, USER, action),
    );
    expect(taken).toBe(1);
  });
});
