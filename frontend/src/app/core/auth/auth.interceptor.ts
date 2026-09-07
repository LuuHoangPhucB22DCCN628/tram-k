import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const apiBaseUrl = inject(API_BASE_URL);

  // Không gửi token đến URL ngoài API của dự án để tránh làm lộ thông tin xác thực.
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');
  const isApiRequest =
    request.url === normalizedApiBaseUrl || request.url.startsWith(`${normalizedApiBaseUrl}/`);
  if (!isApiRequest) return next(request);

  const requestWithToken = auth.accessToken()
    ? request.clone({ setHeaders: { Authorization: `Bearer ${auth.accessToken()}` } })
    : request;

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        !auth.isAuthenticated()
      ) {
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((newToken) => {
          if (!newToken) return throwError(() => error);
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
        }),
      );
    }),
  );
};
