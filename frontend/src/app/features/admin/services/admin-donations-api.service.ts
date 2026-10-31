import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

interface ApiResponse<T> { readonly success: true; readonly data: T }

export interface StatementPreview {
  readonly sheets: readonly string[];
  readonly selectedSheet: string;
  readonly rows: readonly (readonly string[])[];
  readonly totalRows: number;
}

export interface StatementMapping {
  readonly date: number;
  readonly credit: number;
  readonly reference?: number;
  readonly debit?: number;
  readonly description?: number;
}

export interface StatementImportResult {
  readonly batchId: string;
  readonly addedCount: number;
  readonly duplicateCount: number;
  readonly outgoingCount: number;
  readonly pendingReview: number;
  readonly errors: readonly { readonly row: number; readonly message: string }[];
}

export type DonationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface AdminDonationEntry {
  readonly id: string;
  readonly occurredAt: string;
  readonly amountVnd: string;
  readonly sourceReference: string | null;
  readonly description: string | null;
  readonly status: DonationStatus;
  readonly statementImport: { readonly fileName: string; readonly accountKey: string };
}

export interface PublicDonationSummary {
  readonly items: readonly {
    readonly id: string;
    readonly name: string;
    readonly occurredAt: string;
    readonly amountVnd: string;
  }[];
  readonly totalCount: number;
  readonly totalAmountVnd: string;
  readonly page: number;
  readonly limit: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDonationsApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly base = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');

  inspect(file: File, sheet?: string): Observable<StatementPreview> {
    if (!this.http) throw new Error('HttpClient chưa được cấu hình.');
    const body = new FormData();
    body.append('file', file);
    if (sheet) body.append('sheet', sheet);
    return this.http.post<ApiResponse<StatementPreview>>(`${this.base}/admin/donations/inspect`, body)
      .pipe(map(({ data }) => data));
  }

  import(file: File, accountKey: string, sheet: string, headerRow: number,
    mapping: StatementMapping): Observable<StatementImportResult> {
    if (!this.http) throw new Error('HttpClient chưa được cấu hình.');
    const body = new FormData();
    body.append('file', file);
    body.append('options', JSON.stringify({ accountKey, sheet, headerRow, mapping }));
    return this.http.post<ApiResponse<StatementImportResult>>(`${this.base}/admin/donations/import`, body)
      .pipe(map(({ data }) => data));
  }

  list(status: DonationStatus): Observable<readonly AdminDonationEntry[]> {
    if (!this.http) return of([]);
    return this.http.get<ApiResponse<readonly AdminDonationEntry[]>>(`${this.base}/admin/donations?status=${status}`)
      .pipe(map(({ data }) => data));
  }

  review(ids: readonly string[], status: 'CONFIRMED' | 'REJECTED', note?: string): Observable<{ readonly updatedCount: number }> {
    if (!this.http) throw new Error('HttpClient chưa được cấu hình.');
    return this.http.post<ApiResponse<{ readonly updatedCount: number }>>(`${this.base}/admin/donations/review`, { ids, status, note })
      .pipe(map(({ data }) => data));
  }

  publicList(limit = 8, page = 1): Observable<PublicDonationSummary> {
    if (!this.http) return of({ items: [], totalCount: 0, totalAmountVnd: '0', page, limit });
    return this.http.get<ApiResponse<PublicDonationSummary>>(`${this.base}/donations/recent?limit=${limit}&page=${page}`)
      .pipe(map(({ data }) => data));
  }
}
