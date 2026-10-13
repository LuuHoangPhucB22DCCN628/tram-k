import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import type { ManagedResourceType } from './managed-resource-sync.service';

interface PublicManagedResource {
  readonly sourceId: string;
  readonly type: ManagedResourceType;
  readonly payload: unknown;
}

interface PublicManagedResourceStateResponse {
  readonly success: true;
  readonly data: {
    readonly initialized: boolean;
    readonly items: readonly PublicManagedResource[];
  };
}

export interface PublicResourceState<T> {
  readonly initialized: boolean;
  readonly items: readonly T[];
}

@Injectable({ providedIn: 'root' })
export class ManagedResourcePublicApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');

  state<T>(
    type: ManagedResourceType,
    isPayload: (payload: unknown) => payload is T,
  ): Observable<PublicResourceState<T> | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);

    return this.http
      .get<PublicManagedResourceStateResponse>(
        `${this.apiBaseUrl}/managed-resources/public-state?type=${type}`,
      )
      .pipe(
        map((response) => ({
          initialized: response.data.initialized,
          items: response.data.items.map((item) => item.payload).filter(isPayload),
        })),
        catchError(() => of(null)),
      );
  }
}
