import { inject, Injectable } from '@angular/core';
import { switchMap } from 'rxjs';

import { ManagedResourcePublicApiService } from '@core/data/managed-resource-public-api.service';

import type { ContentDetail, ContentKind, ContentListQuery } from '../models/content.models';
import { ContentMockApiService } from './content-mock-api.service';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ContentMockApiService);
  private readonly publicResources = inject(ManagedResourcePublicApiService);

  list(query: ContentListQuery = {}) {
    const type = query.kind ?? 'GUIDE';
    return this.publicResources
      .state<ContentDetail>(type, isContentDetail)
      .pipe(
        switchMap((state) =>
          state?.initialized ? this.api.listFromItems(state.items, query) : this.api.list(query),
        ),
      );
  }

  getBySlug(kind: ContentKind, slug: string) {
    return this.publicResources
      .state<ContentDetail>(kind, isContentDetail)
      .pipe(
        switchMap((state) =>
          state?.initialized
            ? this.api.getBySlugFromItems(state.items, kind, slug)
            : this.api.getBySlug(kind, slug),
        ),
      );
  }

  getCategories(kind?: ContentKind) {
    const type = kind ?? 'GUIDE';
    return this.publicResources
      .state<ContentDetail>(type, isContentDetail)
      .pipe(
        switchMap((state) =>
          state?.initialized
            ? this.api.getCategoriesFromItems(state.items, kind)
            : this.api.getCategories(kind),
        ),
      );
  }
}

function isContentDetail(payload: unknown): payload is ContentDetail {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<ContentDetail>;
  return (
    typeof value.id === 'string' &&
    (value.kind === 'GUIDE' || value.kind === 'STORY' || value.kind === 'CANCER_TYPE') &&
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.excerpt === 'string' &&
    value.status === 'PUBLISHED' &&
    Boolean(value.category && typeof value.category.slug === 'string') &&
    Boolean(value.coverImage && typeof value.coverImage.url === 'string') &&
    Array.isArray(value.tags) &&
    Array.isArray(value.sections) &&
    Array.isArray(value.sources)
  );
}
