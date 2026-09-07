import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { AuthMockApiService } from './auth-mock-api.service';
import type { AuthResult, AuthUser, LoginCredentials, UserRole } from './auth.models';
import { AuthSessionStorageService } from './auth-session-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthMockApiService);
  private readonly storage = inject(AuthSessionStorageService);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly accessTokenState = signal<string | null>(null);
  private readonly rememberMeState = signal(false);

  readonly currentUser = this.userState.asReadonly();
  readonly accessToken = this.accessTokenState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);

  constructor() {
    this.restoreSession();
  }

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.api.login(credentials).pipe(
      tap((result) => this.acceptSession(result, credentials.rememberMe)),
      map((result) => result.user),
    );
  }

  refreshAccessToken(): Observable<string | null> {
    const user = this.userState();
    if (!user) return of(null);

    return this.api.refresh(user).pipe(
      tap((result) => this.acceptSession(result, this.rememberMeState())),
      map((result) => result.accessToken),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  logout(): void {
    this.api.logout().subscribe();
    this.clearSession();
  }

  hasRole(roles: readonly UserRole[]): boolean {
    const role = this.userState()?.role;
    return role ? roles.includes(role) : false;
  }

  defaultRoute(): string {
    return this.userState()?.role === 'ADMIN' ? '/admin' : '/thanh-vien';
  }

  updateDisplayName(displayName: string): void {
    const currentUser = this.userState();
    if (!currentUser) return;

    const updatedUser = { ...currentUser, displayName };
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
    this.refreshAccessToken().subscribe();
  }

  private acceptSession(result: AuthResult, rememberMe: boolean): void {
    this.userState.set(result.user);
    this.accessTokenState.set(result.accessToken);
    this.rememberMeState.set(rememberMe);
    this.storage.write({
      user: result.user,
      rememberMe,
      sessionExpiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
    });
  }

  private clearSession(): void {
    this.userState.set(null);
    this.accessTokenState.set(null);
    this.rememberMeState.set(false);
    this.storage.clear();
  }
}
