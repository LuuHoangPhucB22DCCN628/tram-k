export type UserRole = 'PATIENT' | 'CARER' | 'PARTNER' | 'ADMIN';

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe: boolean;
}

export interface AuthResult {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly accessTokenExpiresInSeconds: number;
}

export interface StoredAuthSession {
  readonly user: AuthUser;
  readonly rememberMe: boolean;
  readonly sessionExpiresAt: number;
}

export type AuthErrorCode = 'ACCOUNT_LOCKED' | 'INVALID_CREDENTIALS' | 'SESSION_EXPIRED';

export class AuthApiError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}
