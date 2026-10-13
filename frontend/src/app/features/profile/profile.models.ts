export type ProfileVisibility = 'PUBLIC' | 'MEMBERS' | 'PRIVATE';

export interface MemberProfile {
  readonly version: number;
  readonly displayName: string;
  readonly phone: string;
  readonly city: string;
  readonly birthYear: string;
  readonly bio: string;
  readonly avatarDataUrl: string | null;
  readonly visibility: ProfileVisibility;
  readonly showEmail: boolean;
  readonly allowComments: boolean;
}

export type ProfileErrorCode = 'CONFLICT' | 'SESSION_EXPIRED' | 'VALIDATION' | 'UNKNOWN';

export class ProfileApiError extends Error {
  constructor(
    readonly code: ProfileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileApiError';
  }
}
