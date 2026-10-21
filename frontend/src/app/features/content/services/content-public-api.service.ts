import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import {
  ContentApiError,
  type ContentCategory,
  type ContentDetail,
  type ContentKind,
  type ContentListQuery,
  type ContentPage,
  type ContentSummary,
} from '../models/content.models';

interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
}

@Injectable({ providedIn: 'root' })
export class ContentPublicApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');

  get isConfigured(): boolean {
    return Boolean(this.http && this.apiBaseUrl);
  }

  list(query: ContentListQuery): Observable<ContentPage<ContentSummary>> {
    const params = this.listParams(query);
    return this.client()
      .get<ApiResponse<ContentPage<ContentSummary>>>(`${this.apiBaseUrl}/public/contents`, {
        params,
      })
      .pipe(map((response) => response.data));
  }

  getBySlug(kind: ContentKind, slug: string): Observable<ContentDetail> {
    return this.client()
      .get<ApiResponse<ContentDetail>>(
        `${this.apiBaseUrl}/public/contents/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`,
      )
      .pipe(
        map((response) => response.data),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            return throwError(
              () =>
                new ContentApiError(
                  'CONTENT_NOT_FOUND',
                  'Nội dung không tồn tại hoặc chưa được xuất bản.',
                ),
            );
          }
          return throwError(() => error);
        }),
      );
  }

  getCategories(kind?: ContentKind): Observable<readonly ContentCategory[]> {
    let params = new HttpParams();
    if (kind) params = params.set('kind', kind);
    return this.client()
      .get<ApiResponse<readonly ContentCategory[]>>(
        `${this.apiBaseUrl}/public/content-categories`,
        { params },
      )
      .pipe(map((response) => response.data));
  }

  private listParams(query: ContentListQuery): HttpParams {
    let params = new HttpParams();
    if (query.kind) params = params.set('kind', query.kind);
    if (query.search) params = params.set('search', query.search);
    if (query.categorySlug) params = params.set('categorySlug', query.categorySlug);
    if (query.tagSlug) params = params.set('tagSlug', query.tagSlug);
    if (query.featured !== undefined) params = params.set('featured', query.featured);
    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.pageSize !== undefined) params = params.set('pageSize', query.pageSize);
    return params;
  }

  private client(): HttpClient {
    if (!this.http || !this.apiBaseUrl) {
      throw new Error('Content public API is not configured.');
    }
    return this.http;
  }
}
