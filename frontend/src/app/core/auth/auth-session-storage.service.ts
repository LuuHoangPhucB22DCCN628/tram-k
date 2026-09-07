import { Injectable } from '@angular/core';

import type { StoredAuthSession } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthSessionStorageService {
  private readonly persistentKey = 'tram-k.auth.persistent';
  private readonly browserSessionKey = 'tram-k.auth.session';

  read(): StoredAuthSession | null {
    const rawValue =
      sessionStorage.getItem(this.browserSessionKey) ?? localStorage.getItem(this.persistentKey);
    if (!rawValue) return null;

    try {
      const value = JSON.parse(rawValue) as StoredAuthSession;
      if (!value.user?.id || !value.user?.email || !value.sessionExpiresAt) {
        this.clear();
        return null;
      }
      return value;
    } catch {
      this.clear();
      return null;
    }
  }

  write(session: StoredAuthSession): void {
    this.clear();
    const storage = session.rememberMe ? localStorage : sessionStorage;
    const key = session.rememberMe ? this.persistentKey : this.browserSessionKey;
    storage.setItem(key, JSON.stringify(session));
  }

  clear(): void {
    localStorage.removeItem(this.persistentKey);
    sessionStorage.removeItem(this.browserSessionKey);
  }
}
