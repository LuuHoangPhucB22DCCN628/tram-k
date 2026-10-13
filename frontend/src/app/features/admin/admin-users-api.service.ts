import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import { environment } from '@environments/environment';

import type { AdminUser, AdminUserRole, AdminUserStatus } from './admin-user.models';
import { AdminUsersMockService } from './admin-users-mock.service';

interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

interface BackendAdminUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: 'PATIENT' | 'CARER' | 'PARTNER' | 'ADMIN';
  readonly status: AdminUserStatus;
  readonly authVersion: number;
  readonly joinedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly mock = inject(AdminUsersMockService);

  list(): Observable<readonly AdminUser[]> {
    if (!this.http || !this.apiBaseUrl) return of(this.mock.list());
    return this.http
      .get<
        ApiSuccessResponse<{
          readonly items: readonly BackendAdminUser[];
          readonly total: number;
        }>
      >(`${this.apiBaseUrl}/admin/users?limit=100`)
      .pipe(
        map(({ data }) => data.items.map((user) => this.toAdminUser(user))),
        catchError((error: HttpErrorResponse) =>
          this.shouldUseMock(error) ? of(this.mock.list()) : throwError(() => error),
        ),
      );
  }

  updateStatus(user: AdminUser, status: AdminUserStatus, reason: string): Observable<AdminUser> {
    if (!this.http || !this.apiBaseUrl) {
      return of(this.mock.updateStatus(user.id, user.authVersion, status));
    }
    return this.http
      .patch<ApiSuccessResponse<BackendAdminUser>>(
        `${this.apiBaseUrl}/admin/users/${encodeURIComponent(user.id)}/status`,
        {
          expectedStatus: user.status,
          expectedAuthVersion: user.authVersion,
          status,
          reason,
        },
      )
      .pipe(
        map(({ data }) => this.toAdminUser(data)),
        catchError((error: HttpErrorResponse) =>
          this.shouldUseMock(error)
            ? of(this.mock.updateStatus(user.id, user.authVersion, status))
            : throwError(() => error),
        ),
      );
  }

  private shouldUseMock(error: HttpErrorResponse): boolean {
    return (
      environment.useMockAuthFallback &&
      (error.status === 0 || error.status === 404 || error.status >= 500)
    );
  }

  private toAdminUser(user: BackendAdminUser): AdminUser {
    const roleLabels: Record<BackendAdminUser['role'], AdminUserRole> = {
      PATIENT: 'Bệnh nhân',
      CARER: 'Người thân',
      PARTNER: 'Đối tác',
      ADMIN: 'Admin',
    };
    return {
      ...user,
      role: roleLabels[user.role],
      joinedAt: new Intl.DateTimeFormat('vi-VN').format(new Date(user.joinedAt)),
    };
  }
}
