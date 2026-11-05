import { describe, expect, it, vi } from 'vitest';
import { supabaseLienStore } from '../src/liens-db.js';

type Client = Parameters<typeof supabaseLienStore>[0];
function fakeClient(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from } as unknown as Client, from };
}
describe('U5 — pas de nouveau lien pour contourner la profondeur RLS', () => {
  it('audit ancien filtré par RLS : pas de recours au service pour le relire', async () => {
    const user = fakeClient(null);
    const service = fakeClient({ site_id: 'site', owner_id: 'owner' });
    expect(
      await supabaseLienStore(service.client, user.client).owns('owner', 'old'),
    ).toBe(false);
    expect(user.from).toHaveBeenCalledWith('audits');
    expect(service.from).not.toHaveBeenCalled();
  });
  it('audit visible : vérifie encore le propriétaire avant de créer un lien', async () => {
    const user = fakeClient({ site_id: 'site' });
    const service = fakeClient({ owner_id: 'owner' });
    expect(
      await supabaseLienStore(service.client, user.client).owns(
        'owner',
        'latest',
      ),
    ).toBe(true);
    expect(service.from).toHaveBeenCalledWith('sites');
    expect(
      await supabaseLienStore(service.client, user.client).owns(
        'stranger',
        'latest',
      ),
    ).toBe(false);
  });
  it('sans client de session : aucun partage propriétaire', async () => {
    const service = fakeClient({ site_id: 'site', owner_id: 'owner' });
    expect(
      await supabaseLienStore(service.client, null).owns('owner', 'old'),
    ).toBe(false);
  });
});
