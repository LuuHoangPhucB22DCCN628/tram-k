export type UserRole = 'PATIENT' | 'CARER' | 'PARTNER' | 'ADMIN';

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly avatarUrl?: string;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe: boolean;
}

export interface RegisterCredentials {
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
  readonly role: Extract<UserRole, 'PATIENT' | 'CARER'>;
}

export type LoginPortal = 'PUBLIC' | 'ADMIN';

export interface AuthResult {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly accessTokenExpiresInSeconds: number;
  readonly authMode?: AuthMode;
}

export type AuthMode = 'LOCAL' | 'REMOTE';

export interface StoredAuthSession {
  readonly user: AuthUser;
  readonly rememberMe: boolean;
  readonly sessionExpiresAt: number;
  readonly authMode?: AuthMode;
}

export type AuthErrorCode =
  | 'INVALID_REGISTRATION_ROLE'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'INVALID_VERIFICATION_TOKEN'
  | 'VERIFICATION_RATE_LIMITED'
  | 'INVALID_RESET_TOKEN'
  | 'PASSWORD_RESET_RATE_LIMITED'
  | 'EMAIL_CHANGE_UNAVAILABLE'
  | 'EMAIL_CHANGE_CONFLICT'
  | 'EMAIL_CHANGE_RATE_LIMITED'
  | 'INVALID_EMAIL_CHANGE_TOKEN'
  | 'WRONG_PORTAL';

export interface EmailChangeRequestResult {
  readonly pendingEmail: string;
}

export interface EmailChangeVerificationResult {
  readonly email: string;
  readonly revokedSessions: number;
}

export class AuthApiError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}
