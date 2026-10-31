import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import type {
  PartnerApplication,
  PartnerApplicationInput,
  PartnerApplicationStatus,
} from '../models/partner-application.models';

interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
}

interface UploadedDocument {
  readonly storageKey: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
}

interface RawPartnerApplication {
  readonly id: string;
  readonly applicantId: string;
  readonly applicant?: { readonly fullName: string };
  readonly organizationName: string;
  readonly representativeName: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly introduction: string;
  readonly documentKeys: readonly string[];
  readonly documents?: readonly UploadedDocument[];
  readonly status: PartnerApplicationStatus;
  readonly reviewReason?: string | null;
  readonly reviewedBy?: { readonly fullName: string } | null;
  readonly reviewedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PartnerApplicationApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly errorState = signal('');

  readonly lastError = this.errorState.asReadonly();

  mine(): Observable<PartnerApplication | null | undefined> {
    if (!this.http || !this.apiBaseUrl) return of(undefined);
    return this.http
      .get<ApiResponse<RawPartnerApplication | null>>(
        `${this.apiBaseUrl}/partner-applications/mine`,
      )
      .pipe(
        map((response) => (response.data ? this.mapApplication(response.data) : null)),
        catchError(() => of(undefined)),
      );
  }

  list(status?: PartnerApplicationStatus): Observable<readonly PartnerApplication[] | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    const query = status ? `?status=${status}` : '';
    return this.http
      .get<ApiResponse<readonly RawPartnerApplication[]>>(
        `${this.apiBaseUrl}/partner-applications/admin${query}`,
      )
      .pipe(
        map((response) => response.data.map((item) => this.mapApplication(item))),
        catchError(() => of(null)),
      );
  }

  upload(files: readonly File[]): Observable<readonly UploadedDocument[] | null> {
    this.errorState.set('');
    if (!this.http || !this.apiBaseUrl) {
      this.errorState.set('Chưa cấu hình kết nối máy chủ. Vui lòng liên hệ quản trị viên.');
      return of(null);
    }
    const body = new FormData();
    for (const file of files) body.append('documents', file, file.name);
    return this.http
      .post<ApiResponse<readonly UploadedDocument[]>>(
        `${this.apiBaseUrl}/partner-applications/documents`,
        body,
      )
      .pipe(
        map((response) => response.data),
        catchError((error: unknown) => {
          this.errorState.set(this.describeError(error, 'Không thể tải tệp minh chứng.'));
          return of(null);
        }),
      );
  }

  submit(
    input: Omit<PartnerApplicationInput, 'documentNames'>,
    documentKeys: readonly string[],
  ): Observable<PartnerApplication | null> {
    this.errorState.set('');
    if (!this.http || !this.apiBaseUrl) {
      this.errorState.set('Chưa cấu hình kết nối máy chủ. Vui lòng liên hệ quản trị viên.');
      return of(null);
    }
    return this.http
      .post<ApiResponse<RawPartnerApplication>>(`${this.apiBaseUrl}/partner-applications/mine`, {
        ...input,
        documentKeys,
      })
      .pipe(
        map((response) => {
          this.errorState.set('');
          return this.mapApplication(response.data);
        }),
        catchError((error: unknown) => {
          this.errorState.set(this.describeError(error, 'Không thể gửi hồ sơ.'));
          return of(null);
        }),
      );
  }

  review(
    applicationId: string,
    decision: Extract<PartnerApplicationStatus, 'APPROVED' | 'REJECTED'>,
    reason = '',
  ): Observable<PartnerApplication | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    return this.http
      .patch<ApiResponse<RawPartnerApplication>>(
        `${this.apiBaseUrl}/partner-applications/admin/${encodeURIComponent(applicationId)}/review`,
        { decision, reason: reason || undefined },
      )
      .pipe(
        map((response) => this.mapApplication(response.data)),
        catchError(() => of(null)),
      );
  }

  download(storageKey: string, originalName: string): void {
    if (!this.http || !this.apiBaseUrl) return;
    this.http
      .get(`${this.apiBaseUrl}/partner-applications/documents/${encodeURIComponent(storageKey)}`, {
        responseType: 'blob',
      })
      .pipe(catchError(() => of(null)))
      .subscribe((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = originalName;
        anchor.click();
        URL.revokeObjectURL(url);
      });
  }

  private mapApplication(item: RawPartnerApplication): PartnerApplication {
    const documents = item.documents ?? [];
    return {
      id: item.id,
      applicantId: item.applicantId,
      applicantName: item.applicant?.fullName ?? item.representativeName,
      organizationName: item.organizationName,
      representativeName: item.representativeName,
      phone: item.phone,
      email: item.email,
      address: item.address,
      introduction: item.introduction,
      documentNames: documents.length
        ? documents.map((document) => document.originalName)
        : item.documentKeys,
      documents,
      status: item.status,
      reviewReason: item.reviewReason ?? undefined,
      reviewedBy: item.reviewedBy?.fullName,
      reviewedAt: item.reviewedAt ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private describeError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return `${fallback} Vui lòng thử lại.`;
    if (error.status === 0) {
      return 'Không kết nối được máy chủ. Vui lòng kiểm tra API Trạm K rồi thử lại.';
    }
    if (error.status === 401) {
      return 'Phiên đăng nhập không hợp lệ. Vui lòng đăng xuất và đăng nhập lại.';
    }
    const message = (error.error as { error?: { message?: string | string[] } } | null)?.error
      ?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
    if (error.status === 413) return 'Tệp minh chứng vượt quá giới hạn tải lên.';
    return `${fallback} Vui lòng thử lại.`;
  }
}
