import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { AuthApiError, type AuthResult, type AuthUser, type LoginCredentials } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthMockApiService {
  login(credentials: LoginCredentials): Observable<AuthResult> {
    const email = credentials.email.trim().toLowerCase();

    if (email === 'khoa@tramk.vn') {
      return throwError(() => new AuthApiError('ACCOUNT_LOCKED', 'Tài khoản đang bị khóa.'));
    }

    if (credentials.password === 'SaiMatKhau1') {
      return throwError(
        () => new AuthApiError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.'),
      );
    }

    return of(this.createResult(this.createUser(email)));
  }

  refresh(user: AuthUser): Observable<AuthResult> {
    return of(this.createResult(user));
  }

  logout(): Observable<void> {
    return of(undefined);
  }

  private createUser(email: string): AuthUser {
    const role =
      email === 'admin@tramk.vn' ? 'ADMIN' : email === 'doitac@tramk.vn' ? 'PARTNER' : 'PATIENT';

    return {
      id: `USR-${email === 'admin@tramk.vn' ? 'ADMIN' : 'DEMO'}`,
      displayName:
        role === 'ADMIN'
          ? 'Admin Trạm K'
          : role === 'PARTNER'
            ? 'Đối tác Trạm K'
            : 'Thành viên Trạm K',
      email,
      role,
    };
  }

  private createResult(user: AuthUser): AuthResult {
    return {
      user,
      accessToken: `mock-access-${user.id}-${Date.now()}`,
      accessTokenExpiresInSeconds: 15 * 60,
    };
  }
}
