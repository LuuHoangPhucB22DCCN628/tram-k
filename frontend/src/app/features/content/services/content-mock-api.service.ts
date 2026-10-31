import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { normalizeSearchText } from '@shared/utils/search-text';

import { MOCK_CONTENT_ITEMS } from '../data/content.mock-data';
import {
  DEFAULT_CONTENT_PAGE_SIZE,
  MAX_CONTENT_PAGE_SIZE,
  ContentApiError,
  type ContentCategory,
  type ContentDetail,
  type ContentKind,
  type ContentListQuery,
  type ContentPage,
  type ContentPageSize,
  type ContentSummary,
} from '../models/content.models';
import { ContentAdminStorageService } from './content-admin-storage.service';

const DEFAULT_PAGE_SIZE: ContentPageSize = DEFAULT_CONTENT_PAGE_SIZE;

@Injectable({ providedIn: 'root' })
export class ContentMockApiService {
  private readonly adminStorage = inject(ContentAdminStorageService);

  list(query: ContentListQuery = {}): Observable<ContentPage<ContentSummary>> {
    return this.listFromItems(this.items(), query);
  }

  listFromItems(
    sourceItems: readonly ContentDetail[],
    query: ContentListQuery = {},
  ): Observable<ContentPage<ContentSummary>> {
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const searchTerm = normalizeSearchText(query.search ?? '');

    const filteredItems = sourceItems
      .filter((item) => item.status === 'PUBLISHED')
      .filter((item) => !query.kind || item.kind === query.kind)
      .filter((item) => !query.categorySlug || item.category.slug === query.categorySlug)
      .filter((item) => !query.tagSlug || item.tags.some((tag) => tag.slug === query.tagSlug))
      .filter((item) => query.featured === undefined || item.featured === query.featured)
      .filter((item) => !searchTerm || this.matchesSearch(item, searchTerm))
      .sort(
        (first, second) =>
          Number(second.featured) - Number(first.featured) ||
          second.publishedAt.localeCompare(first.publishedAt),
      );

    const totalItems = filteredItems.length;
    const start = (page - 1) * pageSize;
    const items = filteredItems.slice(start, start + pageSize).map((item) => this.toSummary(item));

    return of({
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  }

  getBySlug(kind: ContentKind, slug: string): Observable<ContentDetail> {
    return this.getBySlugFromItems(this.items(), kind, slug);
  }

  getBySlugFromItems(
    sourceItems: readonly ContentDetail[],
    kind: ContentKind,
    slug: string,
  ): Observable<ContentDetail> {
    const item = sourceItems.find(
      (candidate) =>
        candidate.status === 'PUBLISHED' && candidate.kind === kind && candidate.slug === slug,
    );

    return item
      ? of(item)
      : throwError(
          () =>
            new ContentApiError(
              'CONTENT_NOT_FOUND',
              'Nội dung không tồn tại hoặc chưa được xuất bản.',
            ),
        );
  }

  getCategories(kind?: ContentKind): Observable<readonly ContentCategory[]> {
    return this.getCategoriesFromItems(this.items(), kind);
  }

  getCategoriesFromItems(
    sourceItems: readonly ContentDetail[],
    kind?: ContentKind,
  ): Observable<readonly ContentCategory[]> {
    const categories = new Map<string, ContentCategory>();

    for (const item of sourceItems) {
      if (item.status === 'PUBLISHED' && (!kind || item.kind === kind)) {
        categories.set(item.category.id, item.category);
      }
    }

    return of(
      [...categories.values()].sort((first, second) => first.name.localeCompare(second.name)),
    );
  }

  private matchesSearch(item: ContentDetail, searchTerm: string): boolean {
    const searchableText = [
      item.title,
      item.excerpt,
      item.category.name,
      ...item.tags.map((tag) => tag.name),
    ].join(' ');

    return normalizeSearchText(searchableText).includes(searchTerm);
  }

  private items(): readonly ContentDetail[] {
    return this.adminStorage.resolve(MOCK_CONTENT_ITEMS);
  }

  private normalizePage(page?: number): number {
    return Number.isInteger(page) && Number(page) > 0 ? Number(page) : 1;
  }

  private normalizePageSize(pageSize?: ContentPageSize): ContentPageSize {
    return Number.isInteger(pageSize) && Number(pageSize) > 0
      ? Math.min(Number(pageSize), MAX_CONTENT_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  }

  private toSummary(item: ContentDetail): ContentSummary {
    const {
      status: _status,
      authorName: _authorName,
      sections: _sections,
      sources: _sources,
      medicalDisclaimer: _medicalDisclaimer,
      ...summary
    } = item;
    return summary;
  }
}
