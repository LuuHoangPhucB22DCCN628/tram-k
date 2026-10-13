import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import type {
  AccountNotification,
  AccountNotificationKind,
} from './account-notification-storage.service';

interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

interface RemoteNotification {
  readonly id: string;
  readonly recipientId: string;
  readonly kind: AccountNotificationKind;
  readonly title: string;
  readonly message: string;
  readonly link: string;
  readonly dedupeKey?: string | null;
  readonly readAt?: string | null;
  readonly createdAt: string;
}

export interface AccountNotificationPage {
  readonly items: readonly AccountNotification[];
  readonly unreadCount: number;
  readonly nextCursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountNotificationApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');

  list(limit = 50): Observable<AccountNotificationPage | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    return this.http
      .get<
        ApiSuccessResponse<{
          items: readonly RemoteNotification[];
          unreadCount: number;
          nextCursor: string | null;
        }>
      >(`${this.apiBaseUrl}/notifications`, { params: { limit } })
      .pipe(
        map(({ data }) => ({
          ...data,
          items: data.items.map((notification) => ({
            id: notification.id,
            recipientUserId: notification.recipientId,
            kind: notification.kind,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            createdAt: notification.createdAt,
            readAt: notification.readAt ?? undefined,
            dedupeKey: notification.dedupeKey ?? undefined,
          })),
        })),
        catchError(() => of(null)),
      );
  }

  markRead(notificationId: string): Observable<boolean | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    return this.http
      .patch<ApiSuccessResponse<{ updated: boolean }>>(
        `${this.apiBaseUrl}/notifications/${encodeURIComponent(notificationId)}/read`,
        {},
      )
      .pipe(
        map(({ data }) => data.updated),
        catchError(() => of(null)),
      );
  }

  markAllRead(): Observable<number | null> {
    if (!this.http || !this.apiBaseUrl) return of(null);
    return this.http
      .patch<ApiSuccessResponse<{ updatedCount: number }>>(
        `${this.apiBaseUrl}/notifications/read-all`,
        {},
      )
      .pipe(
        map(({ data }) => data.updatedCount),
        catchError(() => of(null)),
      );
  }
}
