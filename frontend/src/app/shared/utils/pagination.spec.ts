import type { ActivatedRoute, Router } from '@angular/router';
import { paginateItems, parsePaginationPage, updatePaginationUrl } from './pagination';

describe('paginateItems', () => {
  it('splits content into pages and clamps an invalid requested page', () => {
    const items = Array.from({ length: 14 }, (_, index) => index + 1);

    expect(paginateItems(items, 2, 6)).toEqual({
      items: [7, 8, 9, 10, 11, 12],
      page: 2,
      totalPages: 3,
    });
    expect(paginateItems(items, 99, 6)).toEqual({
      items: [13, 14],
      page: 3,
      totalPages: 3,
    });
  });

  it('parses valid pages and ignores invalid query values', () => {
    expect(parsePaginationPage('3')).toBe(3);
    expect(parsePaginationPage('0')).toBeNull();
    expect(parsePaginationPage('2.5')).toBeNull();
    expect(parsePaginationPage('abc')).toBeNull();
  });

  it('merges or removes a page query parameter without losing the fragment', async () => {
    const navigate = vi.fn().mockResolvedValue(true);
    const router = { navigate } as unknown as Router;
    const route = {} as ActivatedRoute;

    await updatePaginationUrl(router, route, 'podcastPage', 2);
    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { podcastPage: 2 },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });

    await updatePaginationUrl(router, route, 'podcastPage', null);
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { podcastPage: null } }),
    );
  });
});
