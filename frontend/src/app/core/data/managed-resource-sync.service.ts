import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

export type ManagedResourceType =
  'GUIDE' | 'CANCER_TYPE' | 'STORY' | 'PODCAST' | 'SUPPORT_PROGRAM' | 'DONATION_LOCATION';
export type ManagedResourceStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export interface ManagedResourceSyncInput {
  readonly sourceId: string;
  readonly type: ManagedResourceType;
  readonly status: ManagedResourceStatus;
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly metadata: string;
  readonly imageUrl?: string;
  readonly imageAlt?: string;
  readonly link: string;
  readonly publishedAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

@Injectable({ providedIn: 'root' })
export class ManagedResourceSyncService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly errorState = signal('');

  readonly lastError = this.errorState.asReadonly();

  upsert(resource: ManagedResourceSyncInput): void {
    this.upsertResult(resource).subscribe();
  }

  upsertResult(resource: ManagedResourceSyncInput): Observable<boolean> {
    if (!this.http || !this.apiBaseUrl) return of(false);
    const body = {
      status: resource.status,
      title: resource.title,
      description: resource.description,
      eyebrow: resource.eyebrow,
      metadata: resource.metadata,
      imageUrl: this.externalUrl(resource.imageUrl),
      imageAlt: resource.imageAlt,
      link: resource.link,
      publishedAt: resource.publishedAt,
      payload: this.sanitizePayload(resource.payload),
    };

    return this.http
      .put(
        `${this.apiBaseUrl}/managed-resources/${resource.type}/${encodeURIComponent(resource.sourceId)}`,
        body,
      )
      .pipe(
        map(() => {
          this.errorState.set('');
          return true;
        }),
        catchError(() => {
          this.errorState.set('Dữ liệu chưa đồng bộ được với máy chủ.');
          return of(false);
        }),
      );
  }

  remove(type: ManagedResourceType, sourceId: string): void {
    this.removeResult(type, sourceId).subscribe();
  }

  removeResult(type: ManagedResourceType, sourceId: string): Observable<number | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    return this.http
      .delete<{ readonly success: true; readonly data: { readonly deletedRegistrations: number } }>(
        `${this.apiBaseUrl}/managed-resources/${type}/${encodeURIComponent(sourceId)}`,
      )
      .pipe(
        map((response) => {
          this.errorState.set('');
          return response.data.deletedRegistrations;
        }),
        catchError(() => {
          this.errorState.set('Chưa xóa được chương trình trên máy chủ.');
          return of(null);
        }),
      );
  }

  private externalUrl(value?: string): string | undefined {
    return value && !value.startsWith('data:') ? value : undefined;
  }

  private sanitizePayload(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, this.sanitizeValue(value)]),
    );
  }

  private sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string' && value.startsWith('data:')) {
      return '[Tệp phương tiện được lưu ở bộ nhớ cục bộ]';
    }
    if (Array.isArray(value)) return value.map((item) => this.sanitizeValue(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
          key,
          this.sanitizeValue(nested),
        ]),
      );
    }
    return value;
  }
}
