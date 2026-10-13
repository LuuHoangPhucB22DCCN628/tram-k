import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

export type MediaUploadKind = 'image' | 'audio';

export interface MediaUploadResult {
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly url: string;
}

interface MediaUploadResponse {
  readonly success: true;
  readonly data: MediaUploadResult;
}

@Injectable({ providedIn: 'root' })
export class MediaUploadApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly errorState = signal('');

  readonly lastError = this.errorState.asReadonly();

  upload(file: File, kind: MediaUploadKind): Observable<MediaUploadResult | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);

    const body = new FormData();
    body.append('file', file, file.name);
    return this.http
      .post<MediaUploadResponse>(`${this.apiBaseUrl}/media/upload?kind=${kind}`, body)
      .pipe(
        map((response) => {
          this.errorState.set('');
          return response.data;
        }),
        catchError(() => {
          this.errorState.set(
            'Tệp đang được xem trước cục bộ nhưng chưa tải được lên máy chủ. Vui lòng thử lại.',
          );
          return of(null);
        }),
      );
  }
}
