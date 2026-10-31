import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import type { ManagedResourceStatus, ManagedResourceType } from './managed-resource-sync.service';

export interface AdminManagedResource {
  readonly sourceId: string;
  readonly type: ManagedResourceType;
  readonly status: ManagedResourceStatus;
  readonly payload: unknown;
}

export interface AdminManagedResourceState {
  readonly initialized: boolean;
  readonly items: readonly AdminManagedResource[];
}

interface AdminManagedResourceStateResponse {
  readonly success: true;
  readonly data: AdminManagedResourceState;
}

@Injectable({ providedIn: 'root' })
export class ManagedResourceAdminApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');

  state(type?: ManagedResourceType): Observable<AdminManagedResourceState | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    const params = new URLSearchParams({ page: '1', limit: '100' });
    if (type) params.set('type', type);
    return this.http
      .get<AdminManagedResourceStateResponse>(
        `${this.apiBaseUrl}/managed-resources/admin-state?${params.toString()}`,
      )
      .pipe(
        map((response) => response.data),
        catchError(() => of(null)),
      );
  }

  mine(
    type: Extract<ManagedResourceType, 'SUPPORT_PROGRAM'>,
  ): Observable<AdminManagedResourceState | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    return this.http
      .get<AdminManagedResourceStateResponse>(
        `${this.apiBaseUrl}/managed-resources/mine?type=${type}`,
      )
      .pipe(
        map((response) => response.data),
        catchError(() => of(null)),
      );
  }
}
