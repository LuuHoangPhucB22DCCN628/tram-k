export type ProfileVisibility = 'PUBLIC' | 'MEMBERS' | 'PRIVATE';

export interface MemberProfile {
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
