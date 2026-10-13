import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { MOCK_CONTENT_ITEMS } from '../data/content.mock-data';
import type { ContentListQuery, ContentSummary } from '../models/content.models';
import { isDefaultEditorCover } from './content-cover.utils';
import { ContentService } from './content.service';

export const CONTENT_SECTION_LIMIT = 4;

type ContentSectionQuery = Omit<ContentListQuery, 'page' | 'pageSize'>;

export function limitContentSection<T>(
  items: readonly T[],
  limit = CONTENT_SECTION_LIMIT,
): readonly T[] {
  return items.slice(0, limit);
}

export function mergeContentSection<T>(
  primaryItems: readonly T[],
  fallbackItems: readonly T[],
  identify: (item: T) => string,
  limit = CONTENT_SECTION_LIMIT,
): readonly T[] {
  const primaryIds = new Set(primaryItems.map(identify));
  return limitContentSection(
    [...primaryItems, ...fallbackItems.filter((item) => !primaryIds.has(identify(item)))],
    limit,
  );
}

@Injectable({ providedIn: 'root' })
export class ContentSectionService {
  private readonly content = inject(ContentService);
  private readonly baseContentIds = new Set(MOCK_CONTENT_ITEMS.map((item) => item.id));

  latest(query: ContentSectionQuery): Observable<readonly ContentSummary[]> {
    return this.content
      .list({ ...query, page: 1, pageSize: 6 })
      .pipe(map((result) => limitContentSection(result.items)));
  }

  latestCreated(
    query: ContentSectionQuery,
    limit = CONTENT_SECTION_LIMIT,
  ): Observable<readonly ContentSummary[]> {
    return this.content.list({ ...query, page: 1, pageSize: 16 }).pipe(
      map((result) =>
        limitContentSection(
          result.items.filter(
            (item) => !this.baseContentIds.has(item.id) && !isDefaultEditorCover(item.coverImage),
          ),
          limit,
        ),
      ),
    );
  }
}
