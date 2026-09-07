import { Injectable } from '@angular/core';

import type { AuthUser } from '@core/auth/auth.models';

import type { MemberProfile } from './profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileStorageService {
  private readonly keyPrefix = 'tram-k.profile.';

  read(user: AuthUser): MemberProfile {
    const fallback = this.createDefault(user);
    const rawValue = localStorage.getItem(this.storageKey(user.id));
    if (!rawValue) return fallback;

    try {
      const saved = JSON.parse(rawValue) as Partial<MemberProfile>;
      return {
        ...fallback,
        ...saved,
        displayName: saved.displayName?.trim() || user.displayName,
      };
    } catch {
      localStorage.removeItem(this.storageKey(user.id));
      return fallback;
    }
  }

  write(userId: string, profile: MemberProfile): void {
    localStorage.setItem(this.storageKey(userId), JSON.stringify(profile));
  }

  private createDefault(user: AuthUser): MemberProfile {
    return {
      displayName: user.displayName,
      phone: '',
      city: '',
      birthYear: '',
      bio: '',
      avatarDataUrl: null,
      visibility: 'MEMBERS',
      showEmail: false,
      allowComments: true,
    };
  }

  private storageKey(userId: string): string {
    return `${this.keyPrefix}${userId}`;
  }
}
