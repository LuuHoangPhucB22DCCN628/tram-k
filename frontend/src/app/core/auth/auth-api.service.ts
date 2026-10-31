import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import { environment } from '@environments/environment';

import { AuthMockApiService } from './auth-mock-api.service';
import {
  AuthApiError,
  type AuthMode,
  type AuthResult,
  type AuthUser,
  type EmailChangeRequestResult,
  type EmailChangeVerificationResult,
  type LoginCredentials,
  type LoginPortal,
  type RegisterCredentials,
} from './auth.models';

interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

interface ApiErrorResponse {
  readonly error?: { readonly message?: string | readonly string[] };
}

interface RegistrationResponse {
  readonly user: AuthUser;
  readonly verificationRequired: true;
}

interface VerificationResponse {
  readonly verified: true;
  readonly userId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly mock = inject(AuthMockApiService);

  login(credentials: LoginCredentials, portal: LoginPortal): Observable<AuthResult> {
    if (!this.http || !this.apiBaseUrl) return this.mock.login(credentials, portal);
    return this.http
      .post<ApiSuccessResponse<AuthResult>>(
        `${this.apiBaseUrl}/auth/login`,
        { email: credentials.email, password: credentials.password, portal },
        { withCredentials: true },
      )
      .pipe(
        map(({ data }) => ({ ...data, authMode: 'REMOTE' as const })),
        catchError((error: HttpErrorResponse) =>
          this.shouldUseMock(error)
            ? this.mock.login(credentials, portal)
            : throwError(() => this.mapError(error, 'INVALID_CREDENTIALS')),
        ),
      );
  }

  register(credentials: RegisterCredentials): Observable<AuthUser> {
    if (!this.http || !this.apiBaseUrl) return this.mock.register(credentials);
    return this.http
      .post<ApiSuccessResponse<RegistrationResponse>>(
        `${this.apiBaseUrl}/auth/register`,
        { ...credentials, acceptedTerms: true, acceptedPrivacy: true },
        { withCredentials: true },
      )
      .pipe(
        map(({ data }) => data.user),
        catchError((error: HttpErrorResponse) =>
          this.shouldUseMock(error)
            ? this.mock.register(credentials)
            : throwError(() =>
                this.mapError(
                  error,
                  error.status === 409 ? 'EMAIL_ALREADY_EXISTS' : 'INVALID_REGISTRATION_ROLE',
                ),
              ),
        ),
      );
  }

  verifyEmail(token: string): Observable<void> {
    if (!this.http || !this.apiBaseUrl) {
      return throwError(
        () =>
          new AuthApiError(
            'INVALID_VERIFICATION_TOKEN',
            'Không thể xác minh khi API chưa sẵn sàng.',
          ),
      );
    }
    return this.http
      .post<ApiSuccessResponse<VerificationResponse>>(`${this.apiBaseUrl}/auth/verify-email`, {
        token,
      })
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(() => this.mapError(error, 'INVALID_VERIFICATION_TOKEN')),
        ),
      );
  }

  resendVerification(email: string): Observable<void> {
    if (!this.http || !this.apiBaseUrl) {
      return throwError(
        () =>
          new AuthApiError(
            'INVALID_VERIFICATION_TOKEN',
            'Không thể gửi email khi API chưa sẵn sàng.',
          ),
      );
    }
    return this.http
      .post<ApiSuccessResponse<{ readonly accepted: true }>>(
        `${this.apiBaseUrl}/auth/resend-verification`,
        { email },
      )
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(() =>
            this.mapError(
              error,
              error.status === 429 ? 'VERIFICATION_RATE_LIMITED' : 'INVALID_VERIFICATION_TOKEN',
            ),
          ),
        ),
      );
  }

  forgotPassword(email: string): Observable<void> {
    if (!this.http || !this.apiBaseUrl) {
      return throwError(
        () => new AuthApiError('INVALID_RESET_TOKEN', 'Không thể gửi email khi API chưa sẵn sàng.'),
      );
    }
    return this.http
      .post<ApiSuccessResponse<{ readonly accepted: true }>>(
        `${this.apiBaseUrl}/auth/forgot-password`,
        { email },
      )
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(() =>
            this.mapError(
              error,
              error.status === 429 ? 'PASSWORD_RESET_RATE_LIMITED' : 'INVALID_RESET_TOKEN',
            ),
          ),
        ),
      );
  }

  resetPassword(token: string, password: string): Observable<void> {
    if (!this.http || !this.apiBaseUrl) {
      return throwError(
        () =>
          new AuthApiError(
            'INVALID_RESET_TOKEN',
            'Không thể đặt lại mật khẩu khi API chưa sẵn sàng.',
          ),
      );
    }
    return this.http
      .post<ApiSuccessResponse<{ readonly reset: true }>>(
        `${this.apiBaseUrl}/auth/reset-password`,
        { token, password },
      )
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(() => this.mapError(error, 'INVALID_RESET_TOKEN')),
        ),
      );
  }

  requestEmailChange(
    newEmail: string,
    currentPassword: string,
    mode: AuthMode,
  ): Observable<EmailChangeRequestResult> {
    if (mode === 'LOCAL' || !this.http || !this.apiBaseUrl) {
      return throwError(
        () =>
          new AuthApiError(
            'EMAIL_CHANGE_UNAVAILABLE',
            'Đổi email cần kết nối với máy chủ tài khoản.',
          ),
      );
    }
    return this.http
      .post<ApiSuccessResponse<{ readonly accepted: true; readonly pendingEmail: string }>>(
        `${this.apiBaseUrl}/auth/email-change/request`,
        { newEmail, currentPassword },
        { withCredentials: true },
      )
      .pipe(
        map(({ data }) => ({ pendingEmail: data.pendingEmail })),
        catchError((error: HttpErrorResponse) =>
          throwError(() =>
            this.mapError(
              error,
              error.status === 409
                ? 'EMAIL_CHANGE_CONFLICT'
                : error.status === 429
                  ? 'EMAIL_CHANGE_RATE_LIMITED'
                  : 'EMAIL_CHANGE_UNAVAILABLE',
            ),
          ),
        ),
      );
  }

  verifyEmailChange(token: string): Observable<EmailChangeVerificationResult> {
    if (!this.http || !this.apiBaseUrl) {
      return throwError(
        () =>
          new AuthApiError(
            'INVALID_EMAIL_CHANGE_TOKEN',
            'Không thể xác minh email mới khi API chưa sẵn sàng.',
          ),
      );
    }
    return this.http
      .post<
        ApiSuccessResponse<{
          readonly changed: true;
          readonly email: string;
          readonly revokedSessions: number;
        }>
      >(`${this.apiBaseUrl}/auth/email-change/verify`, { token }, { withCredentials: true })
      .pipe(
        map(({ data }) => ({ email: data.email, revokedSessions: data.revokedSessions })),
        catchError((error: HttpErrorResponse) =>
          throwError(() => this.mapError(error, 'INVALID_EMAIL_CHANGE_TOKEN')),
        ),
      );
  }

  refresh(user: AuthUser, mode: AuthMode): Observable<AuthResult> {
    if (mode === 'LOCAL' || !this.http || !this.apiBaseUrl) return this.mock.refresh(user);
    return this.http
      .post<ApiSuccessResponse<AuthResult>>(
        `${this.apiBaseUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map(({ data }) => ({ ...data, authMode: 'REMOTE' as const })),
        catchError((error: HttpErrorResponse) =>
          throwError(() => this.mapError(error, 'SESSION_EXPIRED')),
        ),
      );
  }

  logout(mode: AuthMode): Observable<void> {
    if (mode === 'LOCAL' || !this.http || !this.apiBaseUrl) return this.mock.logout();
    return this.http
      .post<ApiSuccessResponse<null>>(
        `${this.apiBaseUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map(() => undefined),
        catchError(() => this.mock.logout()),
      );
  }

  logoutAll(mode: AuthMode): Observable<void> {
    if (mode === 'LOCAL' || !this.http || !this.apiBaseUrl) return this.mock.logout();
    return this.http
      .post<ApiSuccessResponse<{ readonly revokedSessions: number }>>(
        `${this.apiBaseUrl}/auth/logout-all`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(() => this.mapError(error, 'SESSION_EXPIRED')),
        ),
      );
  }

  private shouldUseMock(error: HttpErrorResponse): boolean {
    if (!environment.useMockAuthFallback) return false;
    return error.status === 0;
  }

  private mapError(error: HttpErrorResponse, fallbackCode: AuthApiError['code']): AuthApiError {
    const message = (error.error as ApiErrorResponse | null)?.error?.message;
    const normalizedMessage =
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? Array.from(message).join(' ')
          : undefined;
    return new AuthApiError(fallbackCode, normalizedMessage ?? 'Không thể xác thực tài khoản.');
  }
}
