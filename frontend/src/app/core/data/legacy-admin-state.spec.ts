import { LegacyAdminState } from './legacy-admin-state';

interface Item {
  readonly id: string;
  readonly title: string;
}

describe('LegacyAdminState', () => {
  const key = 'tram-k.test-legacy-admin-state';
  afterEach(() => localStorage.removeItem(key));

  it('preserves overrides and created items until a resolved server list replaces them', () => {
    localStorage.setItem(
      key,
      JSON.stringify({
        overrides: { base: { title: 'Đã sửa' } },
        createdItems: [{ id: 'new', title: 'Bài mới' }],
      }),
    );
    const state = new LegacyAdminState<Item, Partial<Item>>(key);
    const base = [{ id: 'base', title: 'Bản gốc' }];

    expect(state.hasLegacyState()).toBe(true);
    expect(state.migrationItems(base, false)).toEqual([
      { id: 'base', title: 'Đã sửa' },
      { id: 'new', title: 'Bài mới' },
    ]);
    state.update('new', { title: 'Bài mới đã sửa' });
    expect(state.resolve(base)[1].title).toBe('Bài mới đã sửa');

    state.replaceResolved([{ id: 'base', title: 'Từ máy chủ' }]);
    state.update('base', { title: 'Bản mới nhất' });
    expect(state.createdItems()).toEqual([{ id: 'base', title: 'Bản mới nhất' }]);
    state.clearLegacyState();
    expect(state.hasLegacyState()).toBe(false);
    expect(localStorage.getItem(key)).toBeNull();
  });
});
