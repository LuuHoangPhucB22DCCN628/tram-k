import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { MOCK_CONTENT_ITEMS } from '../data/content.mock-data';
import {
  CONTENT_PAGE_SIZES,
  ContentApiError,
  type ContentCategory,
  type ContentDetail,
  type ContentKind,
  type ContentListQuery,
  type ContentPage,
  type ContentPageSize,
  type ContentSummary,
} from '../models/content.models';

const DEFAULT_PAGE_SIZE: ContentPageSize = 6;

@Injectable({ providedIn: 'root' })
export class ContentMockApiService {
  list(query: ContentListQuery = {}): Observable<ContentPage<ContentSummary>> {
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const searchTerm = this.normalizeText(query.search ?? '');

    const filteredItems = MOCK_CONTENT_ITEMS.filter((item) => item.status === 'PUBLISHED')
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
    const item = MOCK_CONTENT_ITEMS.find(
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
    const categories = new Map<string, ContentCategory>();

    for (const item of MOCK_CONTENT_ITEMS) {
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

    return this.normalizeText(searchableText).includes(searchTerm);
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  private normalizePage(page?: number): number {
    return Number.isInteger(page) && Number(page) > 0 ? Number(page) : 1;
  }

  private normalizePageSize(pageSize?: ContentPageSize): ContentPageSize {
    return pageSize && CONTENT_PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
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
