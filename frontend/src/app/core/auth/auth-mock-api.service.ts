import { Injectable } from '@angular/core';
import { from, mergeMap, Observable, of, throwError } from 'rxjs';

import {
  AuthApiError,
  type AuthResult,
  type AuthUser,
  type LoginCredentials,
  type LoginPortal,
  type RegisterCredentials,
} from './auth.models';

interface MockRegisteredAccount {
  readonly user: AuthUser;
  readonly passwordHash: string;
  readonly passwordSalt: string;
  readonly passwordIterations: number;
}

@Injectable({ providedIn: 'root' })
export class AuthMockApiService {
  private readonly registeredAccountsKey = 'tram-k.auth.registered-accounts';
  private readonly passwordIterations = 120_000;

  login(credentials: LoginCredentials, portal: LoginPortal): Observable<AuthResult> {
    const email = credentials.email.trim().toLowerCase();

    if (email === 'khoa@tramk.vn') {
      return throwError(() => new AuthApiError('ACCOUNT_LOCKED', 'Tài khoản đang bị khóa.'));
    }

    const registeredAccount = this.readRegisteredAccounts().find(
      (account) => account.user.email === email,
    );
    if (registeredAccount) {
      if (!['PATIENT', 'CARER'].includes(registeredAccount.user.role)) {
        return this.unverifiedPartner();
      }
      return from(this.verifyPassword(credentials.password, registeredAccount)).pipe(
        mergeMap((matches) =>
          matches
            ? this.authorizePortal(registeredAccount.user, portal)
            : this.invalidCredentials(),
        ),
      );
    }

    const user = this.createDemoUser(email);
    if (!user || credentials.password !== 'Matkhau123') return this.invalidCredentials();
    return this.authorizePortal(user, portal);
  }

  register(credentials: RegisterCredentials): Observable<AuthUser> {
    // Registration must never grant privileged roles, even for a forged request.
    if (!['PATIENT', 'CARER'].includes(credentials.role)) {
      return throwError(
        () =>
          new AuthApiError(
            'INVALID_REGISTRATION_ROLE',
            'Quyền đối tác chỉ được cấp sau khi hồ sơ đối tác được duyệt.',
          ),
      );
    }
    const email = credentials.email.trim().toLowerCase();
    const accounts = this.readRegisteredAccounts();
    const isReservedDemoEmail = ['admin@tramk.vn', 'doitac@tramk.vn', 'phuc@tramk.vn'].includes(
      email,
    );

    if (isReservedDemoEmail || accounts.some((account) => account.user.email === email)) {
      return throwError(
        () => new AuthApiError('EMAIL_ALREADY_EXISTS', 'Email này đã được sử dụng.'),
      );
    }

    const user: AuthUser = {
      id: `USR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      displayName: credentials.displayName.trim(),
      email,
      role: credentials.role,
    };

    return from(this.createPasswordVerifier(credentials.password)).pipe(
      mergeMap((verifier) => {
        const account: MockRegisteredAccount = { user, ...verifier };
        localStorage.setItem(this.registeredAccountsKey, JSON.stringify([...accounts, account]));
        return of(user);
      }),
    );
  }

  private authorizePortal(user: AuthUser, portal: LoginPortal): Observable<AuthResult> {
    const usesCorrectPortal = portal === 'ADMIN' ? user.role === 'ADMIN' : user.role !== 'ADMIN';
    if (!usesCorrectPortal) {
      return throwError(
        () => new AuthApiError('WRONG_PORTAL', 'Tài khoản không có quyền tại cổng đăng nhập này.'),
      );
    }

    return of(this.createResult(user));
  }

  refresh(user: AuthUser): Observable<AuthResult> {
    const account = this.readRegisteredAccounts().find((value) => value.user.id === user.id);
    if (account && !['PATIENT', 'CARER'].includes(account.user.role)) {
      return this.unverifiedPartner();
    }
    return of(this.createResult(account ? { ...user, role: account.user.role } : user));
  }

  logout(): Observable<void> {
    return of(undefined);
  }

  private createDemoUser(email: string): AuthUser | null {
    if (!['admin@tramk.vn', 'doitac@tramk.vn', 'phuc@tramk.vn'].includes(email)) return null;
    const role =
      email === 'admin@tramk.vn' ? 'ADMIN' : email === 'doitac@tramk.vn' ? 'PARTNER' : 'PATIENT';

    return {
      id: `USR-${email === 'admin@tramk.vn' ? 'ADMIN' : 'DEMO'}`,
      displayName:
        role === 'ADMIN' ? 'Admin Trạm K' : role === 'PARTNER' ? 'Minh Anh' : 'Nguyễn Minh Phúc',
      email,
      role,
    };
  }

  private invalidCredentials(): Observable<never> {
    return throwError(
      () => new AuthApiError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.'),
    );
  }

  private unverifiedPartner(): Observable<never> {
    return throwError(
      () =>
        new AuthApiError(
          'INVALID_REGISTRATION_ROLE',
          'Tài khoản đối tác đăng ký theo luồng cũ chưa có hồ sơ được duyệt.',
        ),
    );
  }

  private readRegisteredAccounts(): readonly MockRegisteredAccount[] {
    try {
      const rawValue = localStorage.getItem(this.registeredAccountsKey);
      if (!rawValue) return [];

      const accounts: unknown = JSON.parse(rawValue);
      if (!Array.isArray(accounts)) return [];
      return accounts.filter((account): account is MockRegisteredAccount => {
        if (!account || typeof account !== 'object') return false;
        const value = account as Partial<MockRegisteredAccount>;
        return (
          typeof value.passwordHash === 'string' &&
          typeof value.passwordSalt === 'string' &&
          typeof value.passwordIterations === 'number' &&
          typeof value.user?.id === 'string' &&
          typeof value.user?.displayName === 'string' &&
          typeof value.user?.email === 'string' &&
          ['PATIENT', 'CARER', 'PARTNER'].includes(value.user.role ?? '')
        );
      });
    } catch {
      return [];
    }
  }

  private async createPasswordVerifier(
    password: string,
  ): Promise<Pick<MockRegisteredAccount, 'passwordHash' | 'passwordSalt' | 'passwordIterations'>> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return {
      passwordHash: await this.derivePasswordHash(password, salt, this.passwordIterations),
      passwordSalt: this.bytesToBase64(salt),
      passwordIterations: this.passwordIterations,
    };
  }

  private async verifyPassword(password: string, account: MockRegisteredAccount): Promise<boolean> {
    const salt = this.base64ToBytes(account.passwordSalt);
    const candidate = await this.derivePasswordHash(password, salt, account.passwordIterations);
    return candidate === account.passwordHash;
  }

  private async derivePasswordHash(
    password: string,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number,
  ): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      key,
      256,
    );
    return this.bytesToBase64(new Uint8Array(bits));
  }

  private bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }

  private createResult(user: AuthUser): AuthResult {
    return {
      user,
      accessToken: `mock-access-${user.id}-${Date.now()}`,
      accessTokenExpiresInSeconds: 15 * 60,
      authMode: 'LOCAL',
    };
  }
}
