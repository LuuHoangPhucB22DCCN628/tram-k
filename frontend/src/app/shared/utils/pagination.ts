export interface PaginatedItems<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly totalPages: number;
}

export const EXPANDED_SECTION_PAGE_SIZE = 6;

export function parsePaginationPage(value: string | null): number | null {
  if (!value) return null;
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : null;
}

export function updatePaginationUrl(
  router: Router,
  route: ActivatedRoute,
  parameter: string,
  page: number | null,
): Promise<boolean> {
  return router.navigate([], {
    relativeTo: route,
    queryParams: { [parameter]: page },
    queryParamsHandling: 'merge',
    preserveFragment: true,
    replaceUrl: true,
  });
}

export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): PaginatedItems<T> {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / normalizedPageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), totalPages);
  const start = (page - 1) * normalizedPageSize;

  return {
    items: items.slice(start, start + normalizedPageSize),
    page,
    totalPages,
  };
}
import type { ActivatedRoute, Router } from '@angular/router';
