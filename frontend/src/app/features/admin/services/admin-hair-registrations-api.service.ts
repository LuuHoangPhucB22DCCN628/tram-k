import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

export type HairMode = 'DONATE' | 'RECEIVE';
export type HairStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface HairRegistrationItem {
  readonly id: string;
  readonly reference: string;
  readonly mode: HairMode;
  readonly status: HairStatus;
  readonly fullName: string;
  readonly phone: string;
  readonly province: string;
  readonly district: string;
  readonly createdAt: string;
}

export interface HairRegistrationHistory {
  readonly id: string;
  readonly action: string;
  readonly reason: string | null;
  readonly occurredAt: string;
  readonly before: { readonly status?: HairStatus } | null;
  readonly after: { readonly status?: HairStatus } | null;
}

export interface HairRegistrationDetail extends HairRegistrationItem {
  readonly email: string | null;
  readonly address: string;
  readonly gender: string;
  readonly relativePhone: string | null;
  readonly relativeName: string | null;
  readonly duration: string | null;
  readonly hospital: string | null;
  readonly diagnosis: string | null;
  readonly borrowDate: string | null;
  readonly desiredLength: string | null;
  readonly transparency: string | null;
  readonly donationLocation: string | null;
  readonly donatedLength: string | null;
  readonly acceptedCommitments: readonly string[];
  readonly history: readonly HairRegistrationHistory[];
}

export interface HairRegistrationList {
  readonly items: readonly HairRegistrationItem[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly summary: Readonly<Record<HairStatus, number>>;
}

interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
}

@Injectable({ providedIn: 'root' })
export class AdminHairRegistrationsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL).replace(/\/$/, '')}/community/hair-registrations/admin`;

  list(filters: { mode?: HairMode; status?: HairStatus; q?: string; page: number }) {
    let params = new HttpParams().set('page', filters.page).set('limit', 20);
    if (filters.mode) params = params.set('mode', filters.mode);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.q) params = params.set('q', filters.q);
    return this.http
      .get<ApiResponse<HairRegistrationList>>(this.url, { params })
      .pipe(map(({ data }) => data));
  }

  detail(id: string) {
    return this.http
      .get<ApiResponse<HairRegistrationDetail>>(`${this.url}/${encodeURIComponent(id)}`)
      .pipe(map(({ data }) => data));
  }

  review(id: string, status: Exclude<HairStatus, 'PENDING'>, reason?: string) {
    return this.http
      .patch<ApiResponse<HairRegistrationDetail>>(`${this.url}/${encodeURIComponent(id)}/status`, {
        status,
        ...(reason ? { reason } : {}),
      })
      .pipe(map(({ data }) => data));
  }
}
