import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import {
  HairRegistrationApiError,
  type HairRegistrationReceipt,
  type HairRegistrationRequest,
} from '../models/hair-registration.models';

interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

interface ApiErrorBody {
  readonly error?: {
    readonly message?: string | readonly string[];
  };
}

@Injectable({ providedIn: 'root' })
export class HairRegistrationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL).replace(/\/$/, '');

  submit(request: HairRegistrationRequest): Observable<HairRegistrationReceipt> {
    return this.http
      .post<ApiSuccessResponse<HairRegistrationReceipt>>(
        `${this.apiBaseUrl}/community/hair-registrations`,
        request,
      )
      .pipe(
        map((response) => response.data),
        catchError((error: HttpErrorResponse) =>
          throwError(
            () =>
              new HairRegistrationApiError(
                'SUBMISSION_FAILED',
                this.readErrorMessage(error) ??
                  'Chưa thể gửi đăng ký. Vui lòng kiểm tra kết nối và thử lại.',
              ),
          ),
        ),
      );
  }

  private readErrorMessage(error: HttpErrorResponse): string | null {
    const message = (error.error as ApiErrorBody | null)?.error?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
    return null;
  }
}
