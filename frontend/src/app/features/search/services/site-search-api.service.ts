import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of, type Observable } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import type { SearchResultItem, SearchResultType } from '../models/search.models';

interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

interface SearchPage {
  readonly items: readonly SearchResultItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class SiteSearchApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');

  search(query: string, type?: SearchResultType): Observable<readonly SearchResultItem[] | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);

    let params = new HttpParams().set('q', query.trim()).set('page', 1).set('pageSize', 100);
    if (type) params = params.set('type', type);

    return this.http
      .get<ApiSuccessResponse<SearchPage>>(`${this.apiBaseUrl}/search`, { params })
      .pipe(
        map(({ data }) => data.items),
        catchError(() => of(null)),
      );
  }
}
