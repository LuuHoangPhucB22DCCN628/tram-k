import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

export type HairRegistrationLookupMode = 'RECEIVE' | 'DONATE';
export type HairRegistrationLookupStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface HairRegistrationLookup {
  readonly reference: string;
  readonly mode: HairRegistrationLookupMode;
  readonly status: HairRegistrationLookupStatus;
  readonly submittedAt: string;
  readonly updatedAt: string;
  readonly rejectionReason: string | null;
}

interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
}

@Injectable({ providedIn: 'root' })
export class HairRegistrationLookupApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL).replace(/\/$/, '')}/community/hair-registrations/mine`;

  lookup(reference: string) {
    return this.http
      .get<ApiResponse<HairRegistrationLookup>>(`${this.url}/${encodeURIComponent(reference)}`)
      .pipe(map(({ data }) => data));
  }
}
