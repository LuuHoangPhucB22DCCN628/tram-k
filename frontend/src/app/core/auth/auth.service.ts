import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import type {
  AuthResult,
  AuthMode,
  AuthUser,
  EmailChangeRequestResult,
  EmailChangeVerificationResult,
  LoginCredentials,
  LoginPortal,
  RegisterCredentials,
  UserRole,
} from './auth.models';
import { AuthSessionStorageService } from './auth-session-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly storage = inject(AuthSessionStorageService);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly accessTokenState = signal<string | null>(null);
  private readonly rememberMeState = signal(false);
  private readonly authModeState = signal<AuthMode>('LOCAL');
  private refreshInFlight$: Observable<string | null> | null = null;

  readonly currentUser = this.userState.asReadonly();
  readonly accessToken = this.accessTokenState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly authMode = this.authModeState.asReadonly();

  constructor() {
    this.restoreSession();
  }

  login(credentials: LoginCredentials, portal: LoginPortal = 'PUBLIC'): Observable<AuthUser> {
    return this.api.login(credentials, portal).pipe(
      tap((result) =>
        this.acceptSession(result, result.user.role === 'ADMIN' ? false : credentials.rememberMe),
      ),
      map((result) => result.user),
    );
  }

  register(credentials: RegisterCredentials): Observable<AuthUser> {
    return this.api.register(credentials);
  }

  verifyEmail(token: string): Observable<void> {
    return this.api.verifyEmail(token);
  }

  resendVerification(email: string): Observable<void> {
    return this.api.resendVerification(email);
  }

  forgotPassword(email: string): Observable<void> {
    return this.api.forgotPassword(email);
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.api.resetPassword(token, password);
  }

  requestEmailChange(
    newEmail: string,
    currentPassword: string,
  ): Observable<EmailChangeRequestResult> {
    return this.api.requestEmailChange(newEmail, currentPassword, this.authModeState());
  }

  verifyEmailChange(token: string): Observable<EmailChangeVerificationResult> {
    return this.api.verifyEmailChange(token).pipe(tap(() => this.clearSession()));
  }

  refreshAccessToken(): Observable<string | null> {
    const user = this.userState();
    if (!user) return of(null);
    if (this.refreshInFlight$) return this.refreshInFlight$;

    let refresh$: Observable<string | null>;
    refresh$ = this.api.refresh(user, this.authModeState()).pipe(
      tap((result) => this.acceptSession(result, this.rememberMeState())),
      map((result) => result.accessToken),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
      finalize(() => {
        if (this.refreshInFlight$ === refresh$) this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.refreshInFlight$ = refresh$;
    return refresh$;
  }

  logout(): void {
    this.api.logout(this.authModeState()).subscribe();
    this.clearSession();
  }

  logoutAll(): Observable<void> {
    return this.api.logoutAll(this.authModeState()).pipe(tap(() => this.clearSession()));
  }

  hasRole(roles: readonly UserRole[]): boolean {
    const role = this.userState()?.role;
    return role ? roles.includes(role) : false;
  }

  defaultRoute(): string {
    switch (this.userState()?.role) {
      case 'ADMIN':
        return '/admin';
      case 'PARTNER':
        return '/doi-tac';
      case 'PATIENT':
      case 'CARER':
        return '/thanh-vien';
      default:
        return '/';
    }
  }

  updateDisplayName(displayName: string): void {
    const currentUser = this.userState();
    if (!currentUser) return;

    const updatedUser = { ...currentUser, displayName };
    this.userState.set(updatedUser);
    this.storage.updateUser(updatedUser);
  }

  updateProfileSummary(displayName: string, avatarUrl: string | null): void {
    const currentUser = this.userState();
    if (!currentUser) return;

    const updatedUser = { ...currentUser, displayName, avatarUrl: avatarUrl ?? undefined };
    this.userState.set(updatedUser);
    this.storage.updateUser(updatedUser);
  }

  private restoreSession(): void {
    const storedSession = this.storage.read();
    if (!storedSession) return;

    if (storedSession.sessionExpiresAt <= Date.now()) {
      this.storage.clear();
      return;
    }

    this.userState.set(storedSession.user);
    this.rememberMeState.set(storedSession.rememberMe);
    this.authModeState.set(storedSession.authMode ?? 'LOCAL');
    if (this.authModeState() === 'LOCAL') {
      this.refreshAccessToken().subscribe();
      return;
    }
    // Let dependency injection finish before the HTTP interceptor injects AuthService.
    queueMicrotask(() => {
      if (this.userState()) this.refreshAccessToken().subscribe();
    });
  }

  private acceptSession(result: AuthResult, rememberMe: boolean): void {
    this.userState.set(result.user);
    this.accessTokenState.set(result.accessToken);
    this.rememberMeState.set(rememberMe);
    this.authModeState.set(result.authMode ?? 'LOCAL');
    this.storage.write({
      user: result.user,
      rememberMe,
      sessionExpiresAt:
        Date.now() +
        (result.user.role === 'ADMIN'
          ? 30 * 60 * 1000
          : rememberMe
            ? 30 * 24 * 60 * 60 * 1000
            : 8 * 60 * 60 * 1000),
      authMode: result.authMode ?? 'LOCAL',
    });
  }

  private clearSession(): void {
    this.userState.set(null);
    this.accessTokenState.set(null);
    this.rememberMeState.set(false);
    this.authModeState.set('LOCAL');
    this.storage.clear();
  }
}
